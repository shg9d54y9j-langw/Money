'use strict';

/* ---------- Konstanten ---------- */
const CATEGORIES = [
  { id: 'food',      name: 'Lebensmittel',  icon: '🛒', color: '#1fb57a' },
  { id: 'eating',    name: 'Essen & Trinken', icon: '🍽️', color: '#f4a321' },
  { id: 'home',      name: 'Wohnen',        icon: '🏠', color: '#6c5ce7' },
  { id: 'transport', name: 'Mobilität',     icon: '🚗', color: '#4f8cff' },
  { id: 'shopping',  name: 'Shopping',      icon: '🛍️', color: '#e8559b' },
  { id: 'leisure',   name: 'Freizeit',      icon: '🎉', color: '#00b8d9' },
  { id: 'health',    name: 'Gesundheit',    icon: '💊', color: '#ef4d5e' },
  { id: 'travel',    name: 'Reisen',        icon: '✈️', color: '#14a3a3' },
  { id: 'subs',      name: 'Abos',          icon: '📺', color: '#8e7cf0' },
  { id: 'gifts',     name: 'Geschenke',     icon: '🎁', color: '#ff7a59' },
  { id: 'other',     name: 'Sonstiges',     icon: '📦', color: '#97a0b5' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const STORE_KEY = 'money.v1';
const WARN_AT = 0.8;

/* ---------- Zustand ---------- */
const defaults = {
  expenses: [],
  settings: {
    myName: 'Ich', partnerName: 'Partnerin', currency: 'EUR',
    limitDay: '', limitWeek: '', limitMonth: '', limitBasis: 'share',
  },
};
let state = load();
const ui = { period: 'month', anchor: new Date(), split: 'me', payer: 'me', cat: 'food' };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && Array.isArray(raw.expenses)) return { expenses: raw.expenses, settings: { ...defaults.settings, ...raw.settings } };
  } catch (e) { /* ignore */ }
  return structuredClone(defaults);
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Speichern fehlgeschlagen – Speicher voll oder blockiert.', 'over'); }
}

/* ---------- Helfer ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round2 = n => Math.round(n * 100) / 100;

function money(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: state.settings.currency }).format(n || 0);
}
function curSymbol() {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: state.settings.currency })
    .formatToParts(0).find(p => p.type === 'currency').value;
}
function parseAmount(s) {
  s = String(s).trim().replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? round2(n) : NaN;
}
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function startOfWeek(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const pName = () => state.settings.partnerName || 'Partnerin';
const mName = () => state.settings.myName || 'Ich';

/* Anteile & Saldo */
function myShare(e) { return e.split === 'me' ? e.amount : e.split === 'shared' ? round2(e.amount / 2) : 0; }
function partnerShare(e) { return round2(e.amount - myShare(e)); }
/** positiv = Partnerin schuldet mir */
function balanceOf(e) { return e.payer === 'me' ? partnerShare(e) : -myShare(e); }
/** Betrag, der auf meine Limits zählt */
function limitValue(e) { if (e.settlement) return 0; return state.settings.limitBasis === 'paid' ? (e.payer === 'me' ? e.amount : 0) : myShare(e); }

function inRange(e, from, to) { return e.date >= isoDate(from) && e.date <= isoDate(to); }
function ranges(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ws = startOfWeek(today);
  return {
    day: [today, today],
    week: [ws, addDays(ws, 6)],
    month: [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)],
  };
}
const sumBy = (list, fn) => round2(list.reduce((s, e) => s + fn(e), 0));

function limitStatus() {
  const r = ranges();
  const s = state.settings;
  const out = [];
  for (const [key, label, limKey] of [['day', 'Tageslimit', 'limitDay'], ['week', 'Wochenlimit', 'limitWeek'], ['month', 'Monatslimit', 'limitMonth']]) {
    const spent = sumBy(state.expenses.filter(e => inRange(e, ...r[key])), limitValue);
    const limit = parseFloat(s[limKey]);
    const has = Number.isFinite(limit) && limit > 0;
    const ratio = has ? spent / limit : 0;
    out.push({ key, label, spent, limit: has ? limit : null, ratio, level: !has ? 'none' : ratio > 1 ? 'over' : ratio >= WARN_AT ? 'warn' : 'ok' });
  }
  return out;
}

/* ---------- Navigation ---------- */
const TITLES = { dashboard: 'Übersicht', journal: 'Journal', stats: 'Auswertung', settings: 'Einstellungen' };
function go(view) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  $('#view-title').textContent = TITLES[view];
  window.scrollTo({ top: 0 });
  render();
}
$$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.view)));
$$('[data-goto]').forEach(b => b.addEventListener('click', () => go(b.dataset.goto)));

/* ---------- Rendering ---------- */
function render() {
  $('#today-label').textContent = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  $$('.partner-label').forEach(b => b.textContent = b.closest('#split-seg') ? `Nur ${pName()}` : pName());
  $('#cur-symbol').textContent = curSymbol();
  renderDashboard();
  renderJournal();
  renderStats();
}

function itemHTML(e, showDate = false) {
  const c = CAT[e.category] || CAT.other;
  const tags = [];
  if (e.split === 'shared') tags.push('<span class="tag shared">Geteilt</span>');
  if (e.split === 'partner') tags.push(`<span class="tag partner">Für ${esc(pName())}</span>`);
  if (e.payer === 'partner') tags.push(`<span class="tag paidby">${esc(pName())} zahlte</span>`);
  const dateStr = showDate ? `<span>${fromIso(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>` : '';
  const sub = e.split !== 'me' || e.payer !== 'me' ? `<small>mein Anteil ${money(myShare(e))}</small>` : '';
  return `<div class="item" data-id="${e.id}">
    <div class="cat-ico" style="background:${c.color}1f">${c.icon}</div>
    <div class="info">
      <div class="title">${esc(e.note || c.name)}</div>
      <div class="meta">${dateStr}<span>${esc(c.name)}</span>${tags.join('')}</div>
    </div>
    <div class="val">${money(e.amount)}${sub}</div>
  </div>`;
}
const sorted = list => [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

function renderDashboard() {
  const st = limitStatus();
  const [d, w, m] = st;
  $('#hero-day').textContent = money(d.spent);
  $('#hero-week').textContent = money(w.spent);
  $('#hero-month').textContent = money(m.spent);
  $('.basis-hint').textContent = state.settings.limitBasis === 'paid' ? '(von mir bezahlt)' : '(mein Anteil)';

  // Warnungen
  $('#alerts').innerHTML = st.filter(x => x.level === 'warn' || x.level === 'over').map(x => x.level === 'over'
    ? `<div class="alert over"><span class="ico">⛔</span><div><b>${x.label} überschritten</b>${money(x.spent)} von ${money(x.limit)} – ${money(x.spent - x.limit)} drüber.</div></div>`
    : `<div class="alert warn"><span class="ico">⚠️</span><div><b>${x.label} fast erreicht</b>${Math.round(x.ratio * 100)} % verbraucht, noch ${money(x.limit - x.spent)} übrig.</div></div>`
  ).join('');

  // Limit-Balken
  const withLimit = st.filter(x => x.limit);
  $('#limit-bars').innerHTML = withLimit.length ? withLimit.map(x => `
    <div class="limit">
      <div class="limit-top"><strong>${x.label}</strong><span>${money(x.spent)} <span class="muted">/ ${money(x.limit)}</span></span></div>
      <div class="bar ${x.level === 'ok' ? '' : x.level}"><i style="width:${Math.min(100, x.ratio * 100)}%"></i></div>
      <div class="limit-sub">${x.level === 'over' ? `${money(x.spent - x.limit)} über dem Limit` : `Noch ${money(x.limit - x.spent)} verfügbar`}</div>
    </div>`).join('')
    : `<div class="empty">Noch keine Limits gesetzt. <button class="link-btn" data-goto-settings>Jetzt festlegen</button></div>`;
  const gs = $('[data-goto-settings]'); if (gs) gs.onclick = () => go('settings');

  // Saldo
  const bal = sumBy(state.expenses, balanceOf);
  const initial = esc(pName().trim()[0]?.toUpperCase() || 'P');
  let txt, cls = '';
  if (Math.abs(bal) < 0.005) txt = `<p class="amt">Ausgeglichen</p><p class="muted small">Ihr seid quitt.</p>`;
  else if (bal > 0) { cls = 'pos'; txt = `<p class="muted small">${esc(pName())} schuldet dir</p><p class="amt pos">${money(bal)}</p>`; }
  else { cls = 'neg'; txt = `<p class="muted small">Du schuldest ${esc(pName())}</p><p class="amt neg">${money(-bal)}</p>`; }
  $('#balance-card').innerHTML = `<div class="avatar">${initial}</div><div class="grow">${txt}</div>
    ${Math.abs(bal) >= 0.005 ? `<button class="btn" id="btn-settle">Ausgleichen</button>` : ''}`;
  const settle = $('#btn-settle');
  if (settle) settle.onclick = () => settleUp(bal, cls);

  // Letzte
  const recent = sorted(state.expenses).slice(0, 5);
  $('#recent-list').innerHTML = recent.length ? recent.map(e => itemHTML(e, true)).join('')
    : `<div class="empty">Noch keine Ausgaben. Tippe auf ＋, um loszulegen.</div>`;
}

function settleUp(bal) {
  const who = bal > 0 ? `${pName()} zahlt dir ${money(bal)}` : `Du zahlst ${pName()} ${money(-bal)}`;
  if (!confirm(`Saldo ausgleichen?\n${who}.\n\nEs wird ein Ausgleichs-Eintrag erstellt.`)) return;
  // Ausgleich als Eintrag: wer schuldet, "zahlt" für den anderen
  state.expenses.push({
    id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
    amount: round2(Math.abs(bal)), date: isoDate(new Date()), category: 'other',
    note: 'Ausgleich', payer: bal > 0 ? 'partner' : 'me', split: bal > 0 ? 'me' : 'partner',
    settlement: true, createdAt: Date.now(),
  });
  save(); render(); toast('Saldo ausgeglichen ✓', 'ok');
}

/* Journal */
function journalFiltered() {
  const q = $('#search').value.trim().toLowerCase();
  const cat = $('#filter-cat').value, split = $('#filter-split').value, month = $('#filter-month').value;
  return sorted(state.expenses).filter(e =>
    (!cat || e.category === cat) && (!split || e.split === split) && (!month || e.date.startsWith(month)) &&
    (!q || (e.note || '').toLowerCase().includes(q) || (CAT[e.category]?.name || '').toLowerCase().includes(q)));
}
function renderJournal() {
  const list = journalFiltered();
  const real = list.filter(e => !e.settlement);
  $('#journal-summary').innerHTML = `<span>${real.length} Einträge</span><span>Gesamt ${money(sumBy(real, e => e.amount))} · Mein Anteil ${money(sumBy(real, myShare))}</span>`;
  if (!list.length) { $('#journal-list').innerHTML = `<div class="card empty">Keine Einträge gefunden.</div>`; return; }
  const groups = new Map();
  list.forEach(e => { if (!groups.has(e.date)) groups.set(e.date, []); groups.get(e.date).push(e); });
  const todayIso = isoDate(new Date()), yIso = isoDate(addDays(new Date(), -1));
  $('#journal-list').innerHTML = [...groups].map(([date, items]) => {
    const label = date === todayIso ? 'Heute' : date === yIso ? 'Gestern'
      : fromIso(date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `<div class="day-group"><div class="day-head"><span>${label}</span><span>${money(sumBy(items.filter(e => !e.settlement), e => e.amount))}</span></div>
      <div class="card list">${items.map(e => itemHTML(e)).join('')}</div></div>`;
  }).join('');
}
['#search', '#filter-cat', '#filter-split', '#filter-month'].forEach(s => $(s).addEventListener('input', renderJournal));
$('#filter-cat').insertAdjacentHTML('beforeend', CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join(''));
document.addEventListener('click', ev => {
  const it = ev.target.closest('.item[data-id]');
  if (it) openModal(state.expenses.find(e => e.id === it.dataset.id));
});

/* Auswertung */
function periodRange() {
  const a = ui.anchor;
  if (ui.period === 'week') { const s = startOfWeek(a); return [s, addDays(s, 6)]; }
  if (ui.period === 'month') return [new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 0)];
  return [new Date(a.getFullYear(), 0, 1), new Date(a.getFullYear(), 11, 31)];
}
function periodLabel([from, to]) {
  if (ui.period === 'week') return `${from.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (ui.period === 'month') return from.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  return String(from.getFullYear());
}
function renderStats() {
  const [from, to] = periodRange();
  $('#period-label').textContent = periodLabel([from, to]);
  const list = state.expenses.filter(e => !e.settlement && inRange(e, from, to));
  const total = sumBy(list, e => e.amount);
  const today = new Date();
  const endForAvg = to > today ? today : to;
  const days = Math.max(1, Math.round((endForAvg - from) / 864e5) + 1);
  $('#st-total').textContent = money(total);
  $('#st-mine').textContent = money(sumBy(list, myShare));
  $('#st-partner-label').textContent = `Anteil ${pName()}`;
  $('#st-partner').textContent = money(sumBy(list, partnerShare));
  $('#st-avg').textContent = money(from > today ? 0 : total / days);

  // Kategorien
  const byCat = {};
  list.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + e.amount);
  const cats = Object.entries(byCat).map(([id, v]) => ({ ...(CAT[id] || CAT.other), value: round2(v) })).sort((a, b) => b.value - a.value);
  $('#donut').innerHTML = donutSVG(cats, total);
  $('#cat-legend').innerHTML = cats.length ? cats.map(c => `
    <div class="legend-row"><span class="dot" style="background:${c.color}"></span>
      <span>${c.icon} ${c.name}<span class="pct">${Math.round(c.value / total * 100)} %</span></span><strong>${money(c.value)}</strong>
      <div class="bar"><i style="width:${c.value / cats[0].value * 100}%;background:${c.color}"></i></div></div>`).join('')
    : `<div class="empty">Keine Ausgaben in diesem Zeitraum.</div>`;

  // Verlauf
  let buckets = [];
  if (ui.period === 'year') {
    for (let m = 0; m < 12; m++) {
      const mm = `${from.getFullYear()}-${pad(m + 1)}`;
      buckets.push({ label: new Date(2000, m, 1).toLocaleDateString('de-DE', { month: 'narrow' }), value: sumBy(list.filter(e => e.date.startsWith(mm)), limitValue) });
    }
  } else {
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const iso = isoDate(d);
      buckets.push({
        label: ui.period === 'week' ? d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '') : String(d.getDate()),
        value: sumBy(list.filter(e => e.date === iso), limitValue), today: iso === isoDate(today),
      });
    }
  }
  const lim = ui.period === 'year' ? parseFloat(state.settings.limitMonth) : parseFloat(state.settings.limitDay);
  $('#bars-title').textContent = state.settings.limitBasis === 'paid' ? 'Verlauf (von mir bezahlt)' : 'Verlauf (mein Anteil)';
  $('#bars').innerHTML = barsSVG(buckets, Number.isFinite(lim) && lim > 0 ? lim : null);

  // Für wen
  const groups = [
    ['Nur für mich', list.filter(e => e.split === 'me')],
    ['Für uns beide (geteilt)', list.filter(e => e.split === 'shared')],
    [`Nur für ${pName()}`, list.filter(e => e.split === 'partner')],
  ];
  const paidMe = sumBy(list.filter(e => e.payer === 'me'), e => e.amount);
  const paidP = sumBy(list.filter(e => e.payer === 'partner'), e => e.amount);
  $('#split-breakdown').innerHTML = groups.map(([l, g]) => `<div class="split-row"><span>${esc(l)} <span class="muted">· ${g.length}</span></span><strong>${money(sumBy(g, e => e.amount))}</strong></div>`).join('')
    + `<div class="split-row"><span>Von mir bezahlt</span><strong>${money(paidMe)}</strong></div>`
    + `<div class="split-row"><span>Von ${esc(pName())} bezahlt</span><strong>${money(paidP)}</strong></div>`;
}

function donutSVG(cats, total) {
  const R = 70, r = 48, C = 90;
  if (!total) return `<svg viewBox="0 0 180 180" width="180" height="180"><circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="#eceef5" stroke-width="${R - r}"/><text x="90" y="96" text-anchor="middle" font-size="14" fill="#7b8098">Keine Daten</text></svg>`;
  const circ = 2 * Math.PI * ((R + r) / 2);
  let off = 0;
  const segs = cats.map(c => {
    const len = c.value / total * circ;
    const gap = cats.length > 1 ? Math.min(2, len / 2) : 0;
    const s = `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${c.color}" stroke-width="${R - r}"
      stroke-dasharray="${Math.max(0, len - gap)} ${circ}" stroke-dashoffset="${-off}" transform="rotate(-90 ${C} ${C})"><title>${c.name}: ${money(c.value)}</title></circle>`;
    off += len; return s;
  }).join('');
  return `<svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Ausgaben nach Kategorie">${segs}
    <text x="90" y="86" text-anchor="middle" font-size="12" fill="#7b8098">Gesamt</text>
    <text x="90" y="106" text-anchor="middle" font-size="17" font-weight="800" fill="#1c1f2e">${esc(money(total))}</text></svg>`;
}

function barsSVG(buckets, limit) {
  const W = 360, H = 170, P = { t: 16, b: 22, l: 2, r: 2 };
  const max = Math.max(1, limit || 0, ...buckets.map(b => b.value)) * 1.1;
  const bw = (W - P.l - P.r) / buckets.length;
  const y = v => H - P.b - (v / max) * (H - P.t - P.b);
  const step = buckets.length > 20 ? 5 : 1;
  const bars = buckets.map((b, i) => {
    const x = P.l + i * bw, h = H - P.b - y(b.value);
    const color = limit && b.value > limit ? '#ef4d5e' : b.today ? '#4f8cff' : '#6c5ce7';
    const lbl = (i % step === 0 || i === buckets.length - 1 && step === 1) ? `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#7b8098">${b.label}</text>` : '';
    return `<rect x="${x + bw * 0.18}" y="${y(b.value)}" width="${bw * 0.64}" height="${Math.max(h, b.value ? 2 : 0)}" rx="${Math.min(6, bw * 0.3)}" fill="${color}" opacity="${b.value ? 1 : .15}"><title>${b.label}: ${money(b.value)}</title></rect>${lbl}`;
  }).join('');
  const base = `<line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" stroke="#eceef5"/>`;
  const lim = limit ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(limit)}" y2="${y(limit)}" stroke="#ef4d5e" stroke-dasharray="5 5" stroke-width="1.5"/>
    <text x="${W - P.r}" y="${y(limit) - 5}" text-anchor="end" font-size="9" fill="#ef4d5e">Limit ${esc(money(limit))}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;height:auto">${base}${bars}${lim}</svg>`;
}

$$('#period-seg button').forEach(b => b.addEventListener('click', () => {
  ui.period = b.dataset.period; ui.anchor = new Date();
  $$('#period-seg button').forEach(x => x.classList.toggle('active', x === b));
  renderStats();
}));
function shiftPeriod(dir) {
  const a = ui.anchor;
  ui.anchor = ui.period === 'week' ? addDays(a, 7 * dir)
    : ui.period === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1)
    : new Date(a.getFullYear() + dir, 0, 1);
  renderStats();
}
$('#period-prev').onclick = () => shiftPeriod(-1);
$('#period-next').onclick = () => shiftPeriod(1);

/* ---------- Modal ---------- */
const form = $('#expense-form');
$('#cat-chips').innerHTML = CATEGORIES.map(c => `<button type="button" class="chip" data-cat="${c.id}" style="--chip:${c.color}">${c.icon} ${c.name}</button>`).join('');
$$('#cat-chips .chip').forEach(ch => ch.onclick = () => { ui.cat = ch.dataset.cat; syncModal(); });
$$('#split-seg button').forEach(b => b.onclick = () => { ui.split = b.dataset.split; syncModal(); });
$$('#payer-seg button').forEach(b => b.onclick = () => { ui.payer = b.dataset.payer; syncModal(); });
form.amount.addEventListener('input', syncModal);

function syncModal() {
  $$('#cat-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.cat === ui.cat));
  $$('#split-seg button').forEach(b => b.classList.toggle('active', b.dataset.split === ui.split));
  $$('#payer-seg button').forEach(b => b.classList.toggle('active', b.dataset.payer === ui.payer));
  const amt = parseAmount(form.amount.value);
  const e = { amount: Number.isFinite(amt) ? amt : 0, split: ui.split, payer: ui.payer };
  const bal = balanceOf(e);
  let hint = `Mein Anteil: ${money(myShare(e))}`;
  if (bal > 0) hint += ` · ${pName()} schuldet dir ${money(bal)}`;
  else if (bal < 0) hint += ` · Du schuldest ${pName()} ${money(-bal)}`;
  $('#split-hint').textContent = hint;
}

function openModal(exp) {
  form.reset();
  form.id.value = exp?.id || '';
  form.amount.value = exp ? String(exp.amount).replace('.', ',') : '';
  form.date.value = exp?.date || isoDate(new Date());
  form.note.value = exp?.note || '';
  ui.cat = exp?.category || 'food';
  ui.split = exp?.split || 'me';
  ui.payer = exp?.payer || 'me';
  $('#modal-title').textContent = exp ? 'Ausgabe bearbeiten' : 'Neue Ausgabe';
  $('#btn-delete').hidden = !exp;
  $('#modal').hidden = false;
  syncModal();
  setTimeout(() => form.amount.focus(), 50);
}
function closeModal() { $('#modal').hidden = true; }
$('#btn-add').onclick = () => openModal();
$('#btn-add-top').onclick = () => openModal();
$('#modal-close').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

form.addEventListener('submit', ev => {
  ev.preventDefault();
  const amount = parseAmount(form.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) { toast('Bitte einen gültigen Betrag eingeben.', 'over'); form.amount.focus(); return; }
  const before = limitStatus();
  const data = { amount, date: form.date.value, category: ui.cat, note: form.note.value.trim(), split: ui.split, payer: ui.payer };
  if (form.id.value) {
    const i = state.expenses.findIndex(e => e.id === form.id.value);
    if (i >= 0) state.expenses[i] = { ...state.expenses[i], ...data };
  } else {
    state.expenses.push({ id: crypto.randomUUID?.() || String(Date.now() + Math.random()), createdAt: Date.now(), ...data });
  }
  save(); closeModal(); render();
  notifyLimitChanges(before, limitStatus());
});
$('#btn-delete').onclick = () => {
  if (!confirm('Diese Ausgabe wirklich löschen?')) return;
  state.expenses = state.expenses.filter(e => e.id !== form.id.value);
  save(); closeModal(); render(); toast('Ausgabe gelöscht');
};

function notifyLimitChanges(before, after) {
  const rank = { none: 0, ok: 0, warn: 1, over: 2 };
  let warned = false;
  after.forEach((a, i) => {
    if (rank[a.level] > rank[before[i].level]) {
      warned = true;
      if (a.level === 'over') toast(`⛔ ${a.label} überschritten: ${money(a.spent)} / ${money(a.limit)}`, 'over', 5000);
      else toast(`⚠️ ${a.label} zu ${Math.round(a.ratio * 100)} % erreicht`, 'warn', 4500);
    }
  });
  if (!warned) toast('Gespeichert ✓', 'ok', 1800);
}

/* ---------- Einstellungen ---------- */
const sform = $('#settings-form');
function fillSettings() { for (const [k, v] of Object.entries(state.settings)) if (sform[k]) sform[k].value = v; }
sform.addEventListener('submit', ev => {
  ev.preventDefault();
  const fd = Object.fromEntries(new FormData(sform));
  for (const k of ['limitDay', 'limitWeek', 'limitMonth']) fd[k] = fd[k] === '' ? '' : String(Math.max(0, parseFloat(fd[k]) || 0));
  state.settings = { ...state.settings, ...fd };
  save(); render(); toast('Einstellungen gespeichert ✓', 'ok');
});

function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#btn-export').onclick = () => download(`money-backup-${isoDate(new Date())}.json`, JSON.stringify(state, null, 2), 'application/json');
$('#btn-csv').onclick = () => {
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const splitTxt = { me: 'Nur ich', shared: 'Geteilt', partner: `Nur ${pName()}` };
  const rows = [['Datum', 'Betrag', 'Kategorie', 'Notiz', 'Für wen', 'Bezahlt von', 'Mein Anteil'].join(';')]
    .concat(sorted(state.expenses).map(e => [e.date, String(e.amount).replace('.', ','), q(CAT[e.category]?.name), q(e.note), q(splitTxt[e.split]),
      q(e.payer === 'me' ? mName() : pName()), String(myShare(e)).replace('.', ',')].join(';')));
  download(`money-${isoDate(new Date())}.csv`, '﻿' + rows.join('\n'), 'text/csv');
};
$('#import-file').addEventListener('change', async ev => {
  const file = ev.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.expenses)) throw new Error();
    if (!confirm(`${data.expenses.length} Einträge importieren? Aktuelle Daten werden ersetzt.`)) return;
    state = { expenses: data.expenses, settings: { ...defaults.settings, ...data.settings } };
    save(); fillSettings(); render(); toast('Backup importiert ✓', 'ok');
  } catch { toast('Ungültige Backup-Datei.', 'over'); }
  ev.target.value = '';
});
$('#btn-reset').onclick = () => {
  if (!confirm('Wirklich ALLE Ausgaben und Einstellungen löschen?')) return;
  state = structuredClone(defaults); save(); fillSettings(); render(); toast('Alle Daten gelöscht');
};

/* ---------- Toasts ---------- */
function toast(msg, type = '', ms = 2600) {
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
}

/* ---------- Start ---------- */
fillSettings();
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
