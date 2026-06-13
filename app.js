const $ = (id) => document.getElementById(id);

function clsResult(res) {
  const r = String(res || '').toUpperCase();
  if (r === 'WIN') return 'result-win';
  if (r === 'LOSS') return 'result-loss';
  if (r === 'DRAW') return 'result-draw';
  return 'result-pending';
}
function fmt(v, suffix='') {
  if (v === undefined || v === null || v === '') return '—';
  return `${v}${suffix}`;
}
function wr(v) {
  const n = Number(v || 0);
  return `${n.toFixed(2)}%`;
}
function safeTime(t) {
  if (!t) return '—';
  return String(t).replace('T', ' ').replace('+03:00', '').slice(0, 19);
}
function setStatus(mode) {
  $('marketMode').textContent = mode || '—';
  const dot = $('statusDot');
  dot.className = 'status-dot';
  const m = String(mode || '').toUpperCase();
  if (m.includes('LIVE')) dot.classList.add('live');
  else if (m.includes('WEEKEND') || m.includes('CLOSED')) dot.classList.add('off');
}
function renderRows(tbody, rows, cols, empty='Нет данных') {
  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="${cols}">${empty}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.join('');
}
async function loadStats() {
  try {
    const res = await fetch(`./public_stats.json?t=${Date.now()}`, { cache: 'no-store' });
    const payload = await res.json();
    render(payload.data || payload);
  } catch (e) {
    $('lastUpdate').textContent = `Ошибка загрузки: ${e.message}`;
  }
}
function render(data) {
  setStatus(data.market_mode);
  $('lastUpdate').textContent = `Обновлено: ${safeTime(data.generated_at_moscow)}`;

  const live = data.live || {};
  const today = live.today || {};
  const all = live.all_time || {};
  $('todayWr').textContent = wr(today.wr);
  $('todayWinLoss').textContent = `${fmt(today.wins)} WIN / ${fmt(today.losses)} LOSS / ${fmt(today.draws)} DRAW`;
  $('todaySignals').textContent = `${fmt(live.today_signals_total)}/${fmt(live.daily_cap)}`;
  $('allWr').textContent = wr(all.wr);
  $('allWinLoss').textContent = `${fmt(all.wins)} WIN / ${fmt(all.losses)} LOSS`;

  const setup = data.setup || {};
  const coreCount = Number(setup.active_rules_count || setup.rules_count || 6 || 0);
  $('coreLabel').textContent = coreCount ? `${coreCount} правил` : 'V10 core';
  $('setupRecords').textContent = `${fmt(setup.records_total)} записей ядра`;

  renderRows($('recentSignals'), (live.recent || []).map(x => `
    <tr>
      <td>${safeTime(x.time)}</td><td>${fmt(x.pair)}</td><td>${fmt(x.direction)}</td><td>${fmt(x.expiration)}m</td><td>${fmt(x.rule)}</td>
      <td class="${clsResult(x.result)}">${fmt(x.result)}</td>
    </tr>`), 6);

  renderRows($('pairStats'), (live.pair_stats || []).map(x => `
    <tr><td>${fmt(x.pair)}</td><td>${wr(x.wr)}</td><td>${fmt(x.wins)}/${fmt(x.losses)}</td><td>${fmt(x.total)}</td></tr>`), 4);

  const ruleRows = (setup.by_rule && setup.by_rule.length ? setup.by_rule : live.rule_stats || []);
  renderRows($('ruleStats'), ruleRows.map(x => `
    <tr><td>${fmt(x.rule)}</td><td>${wr(x.wr)}</td><td>${fmt(x.wins)}/${fmt(x.losses)}</td><td>${fmt(x.total)}</td></tr>`), 4);

  const pre = data.pre_signal || {};
  const latest = pre.latest || [];
  if (!latest.length) {
    $('preSignalBox').innerHTML = `<div class="pre-item">Активных pre-signal записей нет. Скрыто дополнительных pre-signal: <b>${fmt(pre.suppressed_total)}</b></div>`;
  } else {
    $('preSignalBox').innerHTML = latest.map(x => `
      <div class="pre-item">
        <b>${fmt(x.pair)} ${fmt(x.direction)} ${fmt(x.horizon)}m</b><br>
        <span>Rule: ${fmt(x.rule)} | setup: ${fmt(x.context)} | ${safeTime(x.last_sent_moscow)}</span>
      </div>`).join('') + `<div class="muted">Скрыто дополнительных pre-signal: ${fmt(pre.suppressed_total)}</div>`;
  }

  const night = data.night || {};
  const ns = night.latest_session || {};
  $('nightDate').textContent = fmt(night.latest_session_date);
  $('nightApproved').textContent = fmt(ns.approved_records);
  $('nightRejected').textContent = fmt(ns.rejected_shadow_records);
  $('nightChecked').textContent = fmt(ns.checked);

  renderRows($('nightPairs'), (night.by_pair || []).map(x => `
    <tr><td>${fmt(x.pair)}</td><td>${wr(x.wr)}</td><td>${fmt(x.wins)}/${fmt(x.losses)}</td><td>${fmt(x.total)}</td></tr>`), 4);

  renderRows($('nightHorizons'), (night.by_horizon || []).map(x => `
    <tr><td>${fmt(x.horizon)}m</td><td>${wr(x.wr)}</td><td>${fmt(x.wins)}/${fmt(x.losses)}</td><td>${fmt(x.total)}</td></tr>`), 4);

  const agent = data.agent || {};
  $('agentInfo').textContent = `${agent.name || 'AI Agent V10'}: ${agent.brain || ''}. Источник данных: ${agent.data_source || ''}. Торговая сессия: ${agent.live_session || ''}. ${agent.risk_note || ''}`;
}
$('refreshBtn').addEventListener('click', loadStats);
loadStats();
setInterval(loadStats, 60000);
