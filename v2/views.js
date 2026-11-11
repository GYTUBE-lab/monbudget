/* Mon Budget v2 — écrans et saisie */
'use strict';
const I = (d, s = 22, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  home: '<path d="M3 10.5 12 4l9 6.5V20H3z"/>', list: '<path d="M8 7h13M8 12h13M8 17h13M3.5 7h.01M3.5 12h.01M3.5 17h.01"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  l: '<path d="m15 18-6-6 6-6"/>', r: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>', check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>', bank: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  tag: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', house: '<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/>',
  transfer: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', leaf: '<path d="M7 21c0-5 2-9 5-11M12 10c4 0 7-3 7-7-4 0-7 3-7 7z"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  minus: '<path d="M5 12h14"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
const ic = (n, s, w) => I(IC[n], s, w);

/* ---------- État de l'interface ---------- */
const ui = { tab: 'home', page: null, month: thisMonth(), acc: '', group: 'all', ops: 'all', q: '', year: new Date().getFullYear(), bilanGroup: 'all', onboard: null };
try { const g = localStorage.getItem('mb2-ui-group'); if (['all', 'perso', 'bungalow'].includes(g)) ui.group = g; } catch {}
const toast = (msg, ms = 2600) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms); };
const amtCls = t => t.treatment === 'transfer' || t.treatment === 'settlement' ? 'tiny' : t.type === 'income' ? 'pos' : 'neg';
const accOptions = (sel, all = false, archived = false) => (all ? `<option value="">Tous comptes</option>` : '') + state.accounts.filter(a => archived || !a.archived || a.id === sel).map(a => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)}${a.archived ? ' (archivé)' : ''}</option>`).join('');
const catOptions = (sel, type) => { const groups = { perso: 'Vie courante', bungalow: 'Bungalow', ventes: 'Ventes' }; return Object.entries(groups).map(([g, l]) => { const cs = visibleCategories(type).filter(c => c.group === g || (g === 'perso' && !groups[c.group])); return cs.length ? `<optgroup label="${l}">${cs.map(c => `<option ${c.name === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>` : ''; }).join('') + (sel && !visibleCategories(type).some(c => c.name === sel) ? `<option selected>${esc(sel)}</option>` : ''); };
const monthNav = (light = false) => `<div class="month${light ? ' light' : ''}"><button data-act="month" data-d="-1" aria-label="Mois précédent">${ic('l', 16, 2.4)}</button><span>${esc(monthLabel(ui.month))}</span><button data-act="month" data-d="1" aria-label="Mois suivant">${ic('r', 16, 2.4)}</button></div>`;
const showAccounts = () => activeAccounts().length > 1;
function txRow(t, showDate = false) {
  const bits = [];
  if (showDate) bits.push(dateFR(t.date));
  bits.push(t.treatment === 'transfer' ? 'Virement interne' : t.treatment === 'settlement' ? 'Débit global carte · déjà compté' : t.splits?.length ? 'Réparti · ' + t.splits.length + ' lignes' : esc(t.category) + (t.subcategory ? ' / ' + esc(t.subcategory) : ''));
  if (showAccounts()) bits.push(esc(accName(t.account)));
  if (t.payment === 'deferred') bits.push('carte différée → ' + dateFR(t.dueDate).slice(0, 5));
  if (isPlanned(t)) bits.push('prévue');
  return `<button class="row-item" data-act="edit-tx" data-id="${esc(t.id)}"><span class="grow"><span class="t" style="display:block">${esc(t.label)}</span><span class="s" style="display:block">${bits.join(' · ')}</span></span><span class="amt ${amtCls(t)}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span></button>`;
}

/* ---------- Rendu principal ---------- */
function render() {
  const app = $('#app');
  if (!state.accounts.length || ui.onboard) { $('#tabs').hidden = true; app.innerHTML = welcome(); return; }
  $('#tabs').hidden = false; renderTabs();
  let h = '';
  if (ui.tab === 'home') h = home();
  else if (ui.tab === 'ops') h = opsView();
  else if (ui.tab === 'due') h = dueView();
  else h = ui.page ? (PAGES[ui.page] || plusView)() : plusView();
  app.innerHTML = h;
  window.updateChip?.();
}
function renderTabs() {
  const b = (tab, icon, label) => `<button data-act="tab" data-tab="${tab}" ${ui.tab === tab ? 'aria-current="page"' : ''}>${ic(icon)}${label}</button>`;
  $('#tabs').innerHTML = `<div class="in">${b('home', 'home', 'Accueil')}${b('ops', 'list', 'Opérations')}<div><button class="plus" data-act="add" aria-label="Ajouter">${ic('plus', 26, 2.6)}</button></div>${b('due', 'cal', 'Échéances')}${b('plus', 'dots', 'Plus')}</div>`;
}
const syncChip = () => `<button class="chip" id="syncChip" data-act="sync-chip" type="button">${ic('cloud', 16)} Google Drive</button>`;

/* ---------- Accueil ---------- */
function home() {
  const m = ui.month, acc = ui.acc, g = ui.group;
  const seg = ['all:Tout', 'perso:Personnel', 'bungalow:Bungalow'].map(x => { const [k, l] = x.split(':'); return `<button data-act="group" data-g="${k}" aria-pressed="${g === k}">${l}</button>`; }).join('');
  let h = `<header class="top"><div class="top-row"><h1>Mon Budget</h1>${syncChip()}</div><div class="ctrls">${monthNav()}${showAccounts() ? `<label class="visually-hidden" for="accSel">Compte</label><select id="accSel" data-change="acc">${accOptions(acc, true)}</select>` : ''}</div><div class="seg" role="group" aria-label="Vue">${seg}</div></header><main class="lift">`;
  h += g === 'bungalow' ? homeBungalow(m, acc) : homeMain(m, acc, g);
  return h + '</main>';
}
function homeMain(m, acc, g) {
  const tot = monthTotals(m, g, acc), hold = holdings(today(), acc), cur = thisMonth();
  const missingAcc = activeAccounts().filter(a => a.opening == null && (!acc || a.id === acc));
  let h = `<section class="card hero"><div class="label">${acc ? 'Solde · ' + esc(accName(acc)) : 'Total des avoirs'} · au ${dateFR(today()).slice(0, 5)}</div><div class="big num">${money(hold.total)}</div>`;
  if (missingAcc.length) h += `<div class="tiny" style="margin-top:4px">Solde de départ manquant : ${missingAcc.map(a => esc(a.name)).join(', ')} · <button class="link" data-act="page" data-page="accounts">Compléter</button></div>`;
  h += `<div class="grid3 split"><div><div class="tiny">Revenus</div><div class="b pos">+${moneyR(tot.income)}</div></div><div><div class="tiny">Dépenses</div><div class="b neg">−${moneyR(tot.expense)}</div></div><div><div class="tiny">Reste</div><div class="b">${moneyR(tot.income - tot.expense)}</div></div></div></section>`;
  /* Rappels */
  const due = dueList(m, acc).filter(d => d.date <= today() || m < cur);
  const cards = [...cardDues(m, acc), ...(m === cur ? cardDues(addMonths(m, 1), acc) : [])].filter(c => c.date >= today());
  const rows = [];
  for (const c of cards.slice(0, 2)) rows.push(`<button class="row-item" data-act="page" data-page="card"><span class="ico c">${ic('card', 18)}</span><span class="grow"><span class="t" style="display:block">Carte différée${showAccounts() ? ' · ' + esc(accName(c.account)) : ''}</span><span class="s" style="display:block">Débit automatique le ${dateFR(c.date).slice(0, 5)} · ${c.count} achat${c.count > 1 ? 's' : ''}</span></span><span class="amt neg">−${money(c.amount)}</span></button>`);
  if (due.length) rows.push(`<button class="row-item" data-act="tab" data-tab="due"><span class="ico w">${ic('clock', 18)}</span><span class="grow"><span class="t" style="display:block">${due.length} échéance${due.length > 1 ? 's' : ''} à confirmer</span><span class="s" style="display:block">Un appui sur ✓ quand c’est passé sur le compte</span></span>${ic('r', 18)}</button>`);
  if (m >= cur) { const f = forecast(m, acc); rows.push(`<button class="row-item" data-act="tab" data-tab="due"><span class="ico g">${ic('cal', 18)}</span><span class="grow"><span class="t" style="display:block">Fin ${m === cur ? 'du mois' : 'de ' + esc(MONTHS[Number(m.slice(5)) - 1])} prévue</span><span class="s" style="display:block">Avec les échéances et la carte différée</span></span><span class="amt">${money(f.total)}</span></button>`); }
  if (rows.length) h += `<section class="card list">${rows.join('')}</section>`;
  /* Enveloppes */
  const env = Object.entries(state.budgets).filter(([c, v]) => v > 0 && (g === 'all' || (groupOf(c) === 'bungalow') === (g === 'bungalow'))).map(([c, v]) => ({ c, v, spent: tot.byCat['expense|' + c] || 0 })).sort((a, b) => b.spent / b.v - a.spent / a.v);
  if (env.length) h += `<section class="card"><div class="head" style="margin-bottom:10px"><h2>Enveloppes</h2><button class="link" data-act="page" data-page="budgets">Tout voir</button></div>${env.slice(0, 4).map(e => envRow(e)).join('')}</section>`;
  /* Dernières opérations */
  const ops = monthTx(m, acc).filter(t => g === 'all' || t.treatment === 'transfer' || (groupOf(t.category) === 'bungalow') === (g === 'bungalow')).slice(0, 6);
  h += `<section class="card list"><div class="head"><h2>Dernières opérations</h2><button class="link" data-act="tab" data-tab="ops">Tout voir</button></div>${ops.length ? ops.map(t => txRow(t, true)).join('') : `<p class="empty">Aucune opération en ${esc(monthLabel(m).toLowerCase())}. Touchez + pour en ajouter.</p>`}</section>`;
  return h;
}
function envRow(e) {
  const pct = Math.min(100, Math.round(e.spent / e.v * 100)), over = e.spent > e.v;
  return `<button class="row-item" style="flex-direction:column;align-items:stretch;gap:6px;border-top:0;padding:6px 0" data-act="budget" data-cat="${esc(e.c)}"><span class="head" style="font-size:14.5px"><span>${esc(e.c)}</span><span class="b ${over ? 'neg' : ''}">${moneyR(e.spent)} / ${moneyR(e.v)}</span></span><span class="bar"><i class="${over ? 'over' : ''}" style="width:${pct}%"></i></span>${over ? `<span class="tiny neg">Dépassé de ${moneyR(e.spent - e.v)}</span>` : ''}</button>`;
}
function homeBungalow(m, acc) {
  const tot = monthTotals(m, 'bungalow', acc), y = m.slice(0, 4);
  const chan = CHANNELS.map(c => tot.bySub['income|Bungalow · Revenus|' + c] || 0);
  const otherInc = tot.income - chan.reduce((a, b) => a + b, 0);
  const com = tot.byCat['expense|Bungalow · Commissions'] || 0, chg = tot.expense - com;
  const stays = state.transactions.filter(t => inBudget(t) && budgetMonthOf(t) === m && t.category === 'Bungalow · Revenus' && CHANNELS.includes(t.subcategory) && (!acc || t.account === acc)).length;
  let yi = 0, ye = 0; for (let i = 1; i <= 12; i++) { const r = monthTotals(y + '-' + pad(i), 'bungalow', acc); yi += r.income; ye += r.expense; }
  const colors = ['#0e5b66', '#e0613c', '#8fc6c4'], base = Math.max(1, chan.reduce((a, b) => a + b, 0));
  let h = `<section class="card hero"><div class="head"><span class="label">Bénéfice bungalow · ${esc(monthLabel(m).toLowerCase())}</span>${stays ? `<span class="tiny b" style="background:var(--coral-l);color:#7c2d12;border-radius:99px;padding:4px 10px">${stays} séjour${stays > 1 ? 's' : ''}</span>` : ''}</div><div class="big num" style="margin:6px 0 10px">${money(tot.income - tot.expense)}</div>`;
  h += `<div class="stack" aria-hidden="true">${chan.map((v, i) => v ? `<i style="width:${v / base * 100}%;background:${colors[i]}"></i>` : '').join('')}</div>`;
  h += `<div class="grid3" style="margin-top:10px">${CHANNELS.map((c, i) => `<div><div class="tiny"><span class="dot" style="background:${colors[i]}"></span>${c === 'Location en direct' ? 'Direct' : c}</div><div class="b">${moneyR(chan[i])}</div></div>`).join('')}</div>`;
  h += `<div class="split small head"><span>Revenus ${moneyR(tot.income)}${otherInc ? ' (dont autres ' + moneyR(otherInc) + ')' : ''}</span><span>Commissions −${moneyR(com)} · Charges −${moneyR(chg)}</span></div></section>`;
  h += `<section class="grid2"><div class="card"><div class="tiny">Revenus ${y}</div><div class="b pos num" style="font-size:20px">+${moneyR(yi)}</div></div><div class="card"><div class="tiny">Bénéfice ${y}</div><div class="b num" style="font-size:20px">${moneyR(yi - ye)}</div></div></section>`;
  h += `<div class="grid2"><button class="btn" data-act="form" data-form="bungalow">${ic('house', 18)} Revenu bungalow</button><button class="btn ghost" data-act="form" data-form="expense" data-cat="Bungalow · Charges">${ic('minus', 18)} Charge bungalow</button></div>`;
  const ops = monthTx(m, acc).filter(t => groupOf(t.category) === 'bungalow').slice(0, 8);
  h += `<section class="card list"><div class="head"><h2>Opérations bungalow</h2></div>${ops.length ? ops.map(t => txRow(t, true)).join('') : `<p class="empty">Aucune opération bungalow ce mois-ci.</p>`}</section>`;
  return h;
}

/* ---------- Opérations ---------- */
function opsView() {
  const q = norm(ui.q);
  let list = q ? state.transactions.filter(t => norm(t.label + ' ' + t.category + ' ' + (t.subcategory || '') + ' ' + (t.note || '') + ' ' + amountInput(t.amount)).includes(q) && (!ui.acc || t.account === ui.acc)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 300) : monthTx(ui.month, ui.acc);
  if (ui.ops === 'expense') list = list.filter(t => t.type === 'expense' && t.treatment !== 'transfer');
  if (ui.ops === 'income') list = list.filter(t => t.type === 'income' && t.treatment !== 'transfer');
  if (ui.ops === 'planned') list = list.filter(isPlanned);
  const nPlanned = monthTx(ui.month, ui.acc).filter(isPlanned).length;
  const f = (k, l) => `<button class="pill s" data-act="ops-filter" data-f="${k}" aria-pressed="${ui.ops === k}">${l}</button>`;
  let h = `<div class="page-top"><div class="row"><h1>Opérations</h1><button class="x" data-act="export-csv" aria-label="Exporter en CSV">${ic('dl', 18)}</button></div>`;
  if (!q) h += `<div class="row">${monthNav()}${showAccounts() ? `<select data-change="acc" aria-label="Compte">${accOptions(ui.acc, true)}</select>` : ''}</div>`;
  h += `<label class="row" style="border:1px solid var(--field);border-radius:12px;padding:0 12px;height:46px;color:var(--muted)">${ic('search', 18)}<span class="visually-hidden">Rechercher</span><input id="q" data-input="q" value="${esc(ui.q)}" placeholder="Rechercher (libellé, catégorie, montant…)" style="flex:1;border:0;outline:none;font-size:16px;background:transparent;min-width:0" autocomplete="off">${ui.q ? `<button class="link" data-act="clear-q">Effacer</button>` : ''}</label>`;
  h += `<div class="pills">${f('all', 'Toutes')}${f('expense', 'Dépenses')}${f('income', 'Revenus')}${f('planned', 'Prévues' + (nPlanned ? ' · ' + nPlanned : ''))}</div></div><main>`;
  if (q) h += `<p class="small" style="margin:0">${list.length} résultat${list.length > 1 ? 's' : ''} sur tous les mois</p>`;
  if (!list.length) return h + `<p class="empty">Aucune opération${q ? ' trouvée' : ' ce mois-ci'}.</p></main>`;
  const byDay = new Map(); for (const t of list) { const k = t.date; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(t); }
  for (const [d, ts] of byDay) {
    const dt = new Date(d + 'T12:00:00');
    h += `<div class="sec">${dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: q ? 'numeric' : undefined })}</div><section class="card list">${ts.map(t => txRow(t)).join('')}</section>`;
  }
  return h + '</main>';
}

/* ---------- Échéances ---------- */
function dueView() {
  const m = ui.month, acc = ui.acc, cur = thisMonth(), t0 = today();
  const list = dueList(m, acc), past = list.filter(d => d.date <= t0 || m < cur), next = list.filter(d => !(d.date <= t0 || m < cur));
  const cards = cardDues(m, acc), done = doneList(m, acc);
  const f = m >= cur ? forecast(m, acc) : null, hold = holdings(t0, acc);
  let h = `<header class="top flat"><div class="top-row"><h1>Échéances</h1>${showAccounts() ? `<select data-change="acc" aria-label="Compte" style="max-width:52%;flex:0 1 auto">${accOptions(acc, true)}</select>` : ''}</div><div class="ctrls">${monthNav()}</div>`;
  h += `<div class="grid2"><div style="background:var(--teal-d);border-radius:14px;padding:10px 12px"><div class="tiny" style="color:#cfe7e6">Solde aujourd’hui</div><div class="num b" style="font-size:20px">${moneyR(hold.total)}</div></div><div style="background:#fff;color:var(--ink);border-radius:14px;padding:10px 12px"><div class="tiny">${f ? 'Fin du mois prévue' : 'Mois passé'}</div><div class="num b" style="font-size:20px">${f ? moneyR(f.total) : '—'}</div></div></div></header><main style="padding-top:14px">`;
  const dueRow = (d, canCheck) => { const ds = dayShort(d.date); return `<div class="row-item"><span class="day"><b>${ds.d}</b>${ds.m}</span><button class="grow" data-act="due-open" data-key="${esc(d.key)}" style="border:0;background:none;text-align:left;padding:0;min-height:44px"><span class="t" style="display:block">${esc(d.label)}</span><span class="s" style="display:block">${d.sched ? payLabel(d.sched.payment) : 'Prévue'}${showAccounts() ? ' · ' + esc(accName(d.account)) : ''}${canCheck ? '' : ' · ' + (d.type === 'income' ? '+' : '−') + money(d.amount)}</span></button>${canCheck ? `<span class="amt ${d.type === 'income' ? 'pos' : 'neg'}" style="margin-right:2px">${d.type === 'income' ? '+' : '−'}${moneyR(d.amount)}</span><button class="check" data-act="due-ok" data-key="${esc(d.key)}" aria-label="Confirmer ${esc(d.label)}">${ic('check', 22, 2.6)}</button>` : ''}</div>`; };
  if (past.length) h += `<div class="sec">Passées ? Touchez ✓ pour confirmer</div><section class="card list">${past.map(d => dueRow(d, true)).join('')}</section>`;
  if (next.length) h += `<div class="sec">À venir</div><section class="card list">${next.map(d => dueRow(d, false)).join('')}</section>`;
  for (const c of cards) { const ds = dayShort(c.date); h += `<button class="card row-item" data-act="page" data-page="card" style="background:var(--coral-l);border-radius:18px;padding:12px 14px"><span class="day" style="color:#7c2d12"><b style="color:#7c2d12">${ds.d}</b>${ds.m}</span><span class="grow"><span class="t" style="display:block">Carte différée${showAccounts() ? ' · ' + esc(accName(c.account)) : ''}</span><span class="s" style="display:block;color:#7c2d12">${c.date <= t0 ? 'Débitée' : 'Calculée seule'} · ${c.count} achat${c.count > 1 ? 's' : ''} du mois précédent</span></span><span class="amt neg">−${money(c.amount)}</span></button>`; }
  if (!past.length && !next.length && !cards.length) h += `<p class="empty">Rien de prévu ce mois-ci.<br>Ajoutez vos prélèvements, crédits, salaire ou pension : ils apparaîtront chaque mois.</p>`;
  h += `<button class="btn dashed full" data-act="form" data-form="schedule">${ic('plus', 18, 2.4)} Nouvelle échéance</button>`;
  if (state.schedules.length) h += `<button class="btn ghost full" data-act="sched-list">Toutes mes échéances (${state.schedules.length})</button>`;
  if (done.length) h += `<details class="card more"><summary>Déjà passées ce mois-ci (${done.length}) ${ic('down', 18)}</summary><div>${done.map(t => txRow(t, true)).join('')}</div></details>`;
  return h + '</main>';
}
const payLabel = p => ({ directDebit: 'Prélèvement', card: 'Carte', transfer: 'Virement', cash: 'Espèces', cheque: 'Chèque', deferred: 'Carte différée', immediate: 'Prélèvement' }[p] || 'Prélèvement');

/* ---------- Plus ---------- */
function plusView() {
  const hold = holdings(); const pend = pendingDeferred().reduce((a, t) => a + t.amount, 0);
  const item = (page, icon, cls, t, s, right = ic('r', 18)) => `<button class="row-item" data-act="page" data-page="${page}"><span class="ico ${cls}">${ic(icon, 20)}</span><span class="grow"><span class="t" style="display:block">${t}</span><span class="s" style="display:block">${s}</span></span>${right}</button>`;
  return `<div class="page-top"><div class="row"><h1>Plus</h1></div></div><main>
  <section class="card list">${item('accounts', 'bank', '', 'Mes comptes', 'Soldes, banques, cartes, virements', `<span class="amt">${moneyR(hold.total)}</span>`)}${item('card', 'card', 'c', 'Carte à paiement différé', 'Achats en attente de débit', pend ? `<span class="amt neg">${moneyR(pend)}</span>` : ic('r', 18))}${item('budgets', 'chart', 'w', 'Budgets (enveloppes)', 'Limites par catégorie')}${item('bilan', 'chart', 'g', 'Bilan annuel', 'Mois par mois, perso et bungalow')}</section>
  <section class="card list">${item('cats', 'tag', '', 'Catégories', 'Catégories et sous-catégories')}${item('backup', 'cloud', 'g', 'Sauvegardes et Google Drive', 'Import du relevé bancaire, export, restauration')}</section>
  <section class="card list">${item('help', 'help', '', 'Aide', 'Comment ça marche')}<div class="row-item"><span class="ico">${ic('phone', 20)}</span><span class="grow"><span class="t" style="display:block">Mon Budget v2</span><span class="s" style="display:block">Version d’essai, données séparées de la version actuelle</span></span></div></section></main>`;
}
const subTop = (title, extra = '') => `<div class="page-top"><div class="row"><button class="back" data-act="back" aria-label="Retour">${ic('l', 20, 2.2)}</button><h1>${title}</h1>${extra}</div></div>`;
const PAGES = {
  accounts() {
    const hold = holdings(); const byBank = new Map();
    for (const a of activeAccounts()) { const k = a.bank || ''; if (!byBank.has(k)) byBank.set(k, []); byBank.get(k).push(a); }
    let h = subTop('Mes comptes') + `<main><section class="card" style="background:var(--teal);color:#fff"><div class="tiny" style="color:#cfe7e6">Total des avoirs · au ${dateFR(today())}</div><div class="big num">${money(hold.total)}</div><div class="tiny" style="color:#cfe7e6">Achats par carte différée non encore débités : ${money(pendingDeferred().reduce((a, t) => a + t.amount, 0))}</div></section>`;
    for (const [bank, accs] of byBank) {
      h += `<section class="card list"><div class="head"><h2>${esc(bank || 'Autres comptes')}</h2><span class="b">${moneyR(accs.reduce((s, a) => s + (balance(a.id) || 0), 0))}</span></div>`;
      for (const a of accs) { const b = balance(a.id); const p = pendingDeferred(a.id).reduce((s, t) => s + t.amount, 0); h += `<button class="row-item" data-act="form" data-form="account" data-id="${esc(a.id)}"><span class="grow"><span class="t" style="display:block">${esc(a.name)}${state.settings.defaultAccount === a.id ? ' <span class="tiny">· par défaut</span>' : ''}</span><span class="s" style="display:block">${({ courant: 'Courant', epargne: 'Épargne', especes: 'Espèces' })[a.type]}${a.card === 'differee' ? ' · carte différée (débit le ' + a.debitDay + ')' : a.card === 'immediate' ? ' · carte immédiate' : ''}${p ? ' · −' + moneyR(p) + ' à venir' : ''}</span></span><span class="amt">${b === null ? '<span class="tiny">Solde à saisir</span>' : money(b)}</span></button>`; }
      h += '</section>';
    }
    h += `<div class="grid2"><button class="btn" data-act="form" data-form="transfer">${ic('transfer', 18)} Virement</button><button class="btn ghost" data-act="form" data-form="account">${ic('plus', 18)} Ajouter un compte</button></div><p class="tiny" style="text-align:center;margin:0">Touchez un compte pour le renommer, régler sa carte, corriger son solde, l’archiver ou le supprimer.</p>`;
    const arch = state.accounts.filter(a => a.archived);
    if (arch.length) h += `<details class="card more"><summary>Comptes archivés (${arch.length}) ${ic('down', 18)}</summary><div>${arch.map(a => `<button class="row-item" data-act="form" data-form="account" data-id="${esc(a.id)}"><span class="grow t">${esc(a.name)}</span>${ic('r', 18)}</button>`).join('')}</div></details>`;
    return h + '</main>';
  },
  card() {
    const accs = activeAccounts().filter(isDeferredAcc);
    let h = subTop('Carte à paiement différé') + '<main>';
    if (!accs.length) return h + `<section class="card"><p style="margin:0 0 12px">Aucun de vos comptes n’a de carte à débit différé.</p><p class="small" style="margin:0 0 14px">Si votre carte est débitée une fois par mois, ouvrez le compte concerné et choisissez « Carte : Différée » avec le jour du débit. Vos achats par carte seront alors automatiquement débités ce jour-là.</p><button class="btn full" data-act="page" data-page="accounts">Mes comptes</button></section></main>`;
    for (const a of accs) {
      const pend = pendingDeferred(a.id), byDue = new Map(); pend.forEach(t => byDue.set(t.dueDate, (byDue.get(t.dueDate) || 0) + t.amount));
      h += `<section class="card hero"><div class="label">À débiter · ${esc(a.name)}</div><div class="big num neg">${money(pend.reduce((s, t) => s + t.amount, 0))}</div>${[...byDue].sort().map(([d, v]) => `<div class="head split"><span>Débit du ${dateFR(d)}</span><span class="b">${money(v)}</span></div>`).join('')}<p class="tiny" style="margin:10px 0 0">Débit automatique le ${a.debitDay} de chaque mois. Rien à saisir : chaque achat « Carte » est ajouté au bon débit. Si vous importez le relevé, la ligne du débit global est reconnue et n’est pas comptée deux fois.<br><b>Un montant déjà débité ?</b> Touchez-le ci-dessous et choisissez « Carte immédiate ».</p></section>`;
      h += `<div class="sec">${pend.length} achat${pend.length > 1 ? 's' : ''} en attente</div><section class="card list">${pend.length ? pend.map(t => txRow(t, true)).join('') : '<p class="empty">Aucun achat en attente.</p>'}</section>`;
    }
    return h + '</main>';
  },
  budgets() {
    const tot = monthTotals(ui.month, 'all');
    const rows = visibleCategories('expense').filter(c => c.kind === 'out').map(c => ({ c: c.name, v: state.budgets[c.name] || 0, spent: tot.byCat['expense|' + c.name] || 0 })).filter(e => e.v > 0 || e.spent > 0);
    const withB = rows.filter(e => e.v > 0), without = rows.filter(e => !e.v);
    const sumB = withB.reduce((a, e) => a + e.v, 0), sumS = withB.reduce((a, e) => a + e.spent, 0);
    let h = subTop('Budgets') + `<main><div class="ctrls" style="justify-content:space-between">${monthNav(true)}<span class="small">Dépensé <b>${moneyR(sumS)}</b> / ${moneyR(sumB)}</span></div>`;
    h += withB.length ? `<section class="card">${withB.sort((a, b) => b.spent / b.v - a.spent / a.v).map(envRow).join('')}</section>` : `<section class="card"><p class="small" style="margin:0">Aucune enveloppe. Une enveloppe fixe une limite mensuelle à une catégorie (par exemple 400 € pour l’alimentation).</p></section>`;
    if (without.length) h += `<div class="sec">Sans limite ce mois-ci</div><section class="card list">${without.map(e => `<button class="row-item" data-act="budget" data-cat="${esc(e.c)}"><span class="grow t">${esc(e.c)}</span><span class="amt">${moneyR(e.spent)}</span><span class="link">Limiter</span></button>`).join('')}</section>`;
    return h + `<button class="btn full" data-act="budget" data-cat="">${ic('plus', 18)} Nouvelle enveloppe</button></main>`;
  },
  bilan() {
    const y = ui.year, g = ui.bilanGroup; const ms = []; let ti = 0, te = 0; const cats = {};
    for (let i = 1; i <= 12; i++) { const r = monthTotals(y + '-' + pad(i), g); ms.push(r); ti += r.income; te += r.expense; for (const [k, v] of Object.entries(r.byCat)) if (k.startsWith('expense|')) cats[k.slice(8)] = (cats[k.slice(8)] || 0) + v; }
    const max = Math.max(1, ...ms.flatMap(r => [r.income, r.expense]));
    const seg = ['all:Tout', 'perso:Perso', 'bungalow:Bungalow'].map(x => { const [k, l] = x.split(':'); return `<button data-act="bilan-group" data-g="${k}" aria-pressed="${g === k}">${l}</button>`; }).join('');
    let h = subTop('Bilan annuel') + `<main><div class="ctrls" style="justify-content:space-between"><div class="month" style="background:#fff"><button data-act="year" data-d="-1" aria-label="Année précédente" style="color:var(--ink)">${ic('l', 16, 2.4)}</button><span style="min-width:60px">${y}</span><button data-act="year" data-d="1" aria-label="Année suivante" style="color:var(--ink)">${ic('r', 16, 2.4)}</button></div><div class="seg light" style="flex:1;max-width:280px">${seg}</div></div>`;
    h += `<section class="card"><div class="small" style="display:flex;gap:14px;margin-bottom:8px"><span><span class="dot" style="background:var(--teal)"></span>Revenus</span><span><span class="dot" style="background:#f0a487"></span>Dépenses</span></div><div class="chart" role="img" aria-label="Revenus et dépenses par mois en ${y}">${ms.map(r => `<div><i style="height:${r.income / max * 100}%;background:var(--teal)"></i><i style="height:${r.expense / max * 100}%;background:#f0a487"></i></div>`).join('')}</div><div class="months" aria-hidden="true">${'JFMAMJJASOND'.split('').map(c => `<span>${c}</span>`).join('')}</div></section>`;
    h += `<section class="grid3"><div class="card" style="padding:12px"><div class="tiny">Revenus</div><div class="b pos">${moneyR(ti)}</div></div><div class="card" style="padding:12px"><div class="tiny">Dépenses</div><div class="b neg">${moneyR(te)}</div></div><div class="card" style="padding:12px"><div class="tiny">Différence</div><div class="b">${moneyR(ti - te)}</div></div></section>`;
    h += `<section class="card" style="padding:4px 16px"><table class="t"><thead><tr><th>Mois</th><th>Revenus</th><th>Dépenses</th><th>Écart</th></tr></thead><tbody>${ms.map((r, i) => r.income || r.expense ? `<tr><td>${esc(MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1))}</td><td>${moneyR(r.income)}</td><td>${moneyR(r.expense)}</td><td class="b">${moneyR(r.income - r.expense)}</td></tr>` : '').join('') || '<tr><td colspan="4" class="small">Aucune opération cette année.</td></tr>'}</tbody></table></section>`;
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (top.length) h += `<section class="card list"><div class="head"><h2>Dépenses par catégorie</h2></div>${top.map(([c, v]) => `<div class="row-item"><span class="grow"><span class="t" style="display:block">${esc(c)}</span><span class="bar" style="display:block;margin-top:6px"><i style="width:${v / top[0][1] * 100}%"></i></span></span><span class="amt">${moneyR(v)}</span></div>`).join('')}</section>`;
    return h + '</main>';
  },
  cats() {
    const groups = { perso: 'Vie courante', bungalow: 'Bungalow', ventes: 'Ventes diverses' };
    let h = subTop('Catégories') + '<main>';
    for (const [g, l] of Object.entries(groups)) {
      const cs = state.categories.filter(c => (c.group === g || (g === 'perso' && !groups[c.group])) && !Object.values(SYSTEM).includes(c.name));
      h += `<div class="sec">${l}</div><section class="card list">${cs.map(c => `<button class="row-item" data-act="form" data-form="category" data-name="${esc(c.name)}"><span class="grow"><span class="t" style="display:block;${c.hidden ? 'color:var(--muted);text-decoration:line-through' : ''}">${esc(c.name)}</span><span class="s" style="display:block">${c.kind === 'in' ? 'Revenu' : 'Dépense'}${c.subs.length ? ' · ' + c.subs.length + ' sous-catégorie' + (c.subs.length > 1 ? 's' : '') : ''}${c.hidden ? ' · masquée' : ''}</span></span>${ic('r', 18)}</button>`).join('')}</section>`;
    }
    return h + `<button class="btn full" data-act="form" data-form="category">${ic('plus', 18)} Nouvelle catégorie</button><button class="btn ghost full" data-act="restore-preset">Rajouter les catégories proposées manquantes</button></main>`;
  },
  backup() {
    const v1 = readV1Local();
    let h = subTop('Sauvegardes') + `<main><section class="card" id="drivePanel">${window.drivePanelHTML ? window.drivePanelHTML() : ''}</section>`;
    h += `<section class="card" style="display:flex;flex-direction:column;gap:12px"><h2>Importer un relevé bancaire (CSV)</h2><p class="small" style="margin:0">Téléchargez le relevé au format CSV depuis l’espace client de votre banque. Colonnes « Montant », ou « Débit » et « Crédit », acceptées. Les doublons sont ignorés.</p><label class="f">Dans le compte<select id="impAcc">${accOptions(defaultAccountId())}</select></label><label class="btn dashed full" style="cursor:pointer">${ic('up', 18)} Choisir le fichier CSV<input type="file" accept=".csv,text/csv,text/plain" data-change="import-csv" class="visually-hidden"></label>`;
    if (state.imports.length) h += `<div class="small"><b>Imports récents</b>${state.imports.slice(0, 5).map(b => `<div class="head" style="padding:6px 0;border-top:1px solid var(--line)"><span>${esc(b.name)} · ${b.ids.length + (b.restore?.length || 0)} op. · ${esc(accName(b.account))}</span><button class="link" data-act="undo-import" data-id="${esc(b.id)}">Annuler</button></div>`).join('')}</div>`;
    h += `</section><section class="card list">`;
    h += `<button class="row-item" data-act="export-json"><span class="ico">${ic('dl', 20)}</span><span class="grow"><span class="t" style="display:block">Télécharger une sauvegarde</span><span class="s" style="display:block">Fichier JSON complet, à garder en lieu sûr</span></span></button>`;
    h += `<label class="row-item" style="cursor:pointer"><span class="ico">${ic('up', 20)}</span><span class="grow"><span class="t" style="display:block">Restaurer une sauvegarde</span><span class="s" style="display:block">Sauvegarde v2, ou sauvegarde de la version actuelle</span></span><input type="file" accept=".json,application/json" data-change="restore-json" class="visually-hidden"></label>`;
    h += `<button class="row-item" data-act="export-csv"><span class="ico">${ic('dl', 20)}</span><span class="grow"><span class="t" style="display:block">Exporter les opérations (CSV)</span><span class="s" style="display:block">Pour un tableur</span></span></button>`;
    if (v1) h += `<button class="row-item" data-act="copy-v1"><span class="ico w">${ic('transfer', 20)}</span><span class="grow"><span class="t" style="display:block">Recopier les données de la version actuelle</span><span class="s" style="display:block">${v1.transactions.length} opérations sur cet appareil · remplace les données v2</span></span></button>`;
    h += `<button class="row-item" data-act="history"><span class="ico">${ic('clock', 20)}</span><span class="grow"><span class="t" style="display:block">Historique automatique</span><span class="s" style="display:block">Revenir à un des 5 derniers états</span></span></button></section>`;
    return h + `<button class="btn danger full" data-act="reset">Effacer toutes les données v2 de cet appareil…</button></main>`;
  },
  help() {
    const p = (t, s) => `<section class="card"><h2 style="margin-bottom:6px">${t}</h2><p class="small" style="margin:0;line-height:1.55">${s}</p></section>`;
    return subTop('Aide') + '<main>' + p('Ajouter une dépense', 'Touchez <b>+</b>, puis « Dépense ». Montant, où, catégorie (devinée d’après vos habitudes), payé avec : c’est tout. La date du jour et votre compte habituel sont remplis d’office ; « Changer » pour les modifier.') +
      p('Carte à débit différé', 'Réglez une fois le compte (Plus › Mes comptes › Carte : Différée, jour du débit). Ensuite, chaque achat « Carte » est automatiquement ajouté au débit du mois suivant. Le solde baisse le jour du débit ; le budget compte la dépense le jour de l’achat.') +
      p('Échéances', 'Prélèvements, crédits, salaire, pension : créez-les une fois. Ils apparaissent chaque mois dans « Échéances ». Le jour venu, touchez ✓. Si le montant a changé, touchez la ligne pour le corriger, ou « Pas ce mois-ci ».') +
      p('Bungalow', 'Raccourci + › Revenu bungalow : canal (direct, Airbnb, Booking), dates, montant payé par le voyageur. La commission est calculée et enregistrée à part. L’onglet Bungalow de l’accueil montre le bénéfice du mois et de l’année.') +
      p('Google Drive', 'Vos données sont copiées dans votre Google Drive (fichier « Mon Budget v2 - données.json »), séparé de la version actuelle. Si le cache est vidé, reconnectez-vous : tout revient.') + '</main>';
  }
};

/* ---------- Bienvenue (première ouverture) ---------- */
function welcome() {
  const v1 = readV1Local();
  if (ui.onboard === 'accounts') {
    const list = state.accounts.map(a => `<div class="card row-item" style="border:0;padding:12px 14px"><span class="ico">${ic('bank', 18)}</span><span class="grow"><span class="t" style="display:block">${esc(a.name)}</span><span class="s" style="display:block">${esc(a.bank || '')} ${a.bank ? '·' : ''} ${({ courant: 'courant', epargne: 'épargne', especes: 'espèces' })[a.type]}${a.card === 'differee' ? ' · carte différée' : ''}</span></span><span class="amt">${a.opening == null ? '' : money(a.opening)}</span></div>`).join('');
    return `<div class="welcome"><header class="top"><div class="steps" aria-label="Étape 2 sur 2"><span class="on"></span><span class="on"></span></div><h1 style="font-size:26px;margin-top:8px">Quels sont vos comptes ?</h1><p style="margin:0;color:#dbeeed;font-size:14px">Ajoutez-les comme vous les voyez chez votre banque. Vous pourrez les modifier à tout moment.</p></header><main>${list}<section class="card" style="border:1.5px solid var(--teal)">${accountFields({}, true)}<button class="btn soft full" data-act="onb-add" style="margin-top:12px">Ajouter ce compte</button></section></main><div style="padding:14px 16px calc(20px + env(safe-area-inset-bottom));display:flex;gap:10px;max-width:760px;margin:0 auto;width:100%"><button class="btn full" data-act="onb-done" ${state.accounts.length ? '' : 'disabled style="opacity:.5"'}>Continuer${state.accounts.length ? ' · ' + state.accounts.length + ' compte' + (state.accounts.length > 1 ? 's' : '') : ''}</button></div></div>`;
  }
  return `<div class="welcome"><header class="top"><h1 style="font-size:28px">Mon Budget v2</h1><p style="margin:0;color:#dbeeed;font-size:15px;line-height:1.5">La version simplifiée, à tester à côté de la version actuelle. Ses données sont séparées : rien de ce que vous faites ici ne modifie l’autre version.</p></header><main>
  ${v1 ? `<button class="card row-item" data-act="copy-v1" style="border:2px solid var(--teal)"><span class="ico">${ic('transfer', 20)}</span><span class="grow"><span class="t" style="display:block">Copier mes données actuelles</span><span class="s" style="display:block;white-space:normal">${v1.transactions.length} opérations trouvées sur cet appareil. Recommandé pour comparer avec vos vrais chiffres.</span></span>${ic('r', 18)}</button>` : ''}
  <button class="card row-item" data-act="drive-start"><span class="ico g">${ic('cloud', 20)}</span><span class="grow"><span class="t" style="display:block">Récupérer depuis Google Drive</span><span class="s" style="display:block;white-space:normal">Vos données v2${v1 ? '' : ', ou à défaut celles de la version actuelle'}, sauvegardées dans votre Drive.</span></span>${ic('r', 18)}</button>
  <button class="card row-item" data-act="onb-start"><span class="ico w">${ic('plus', 20)}</span><span class="grow"><span class="t" style="display:block">Commencer avec un budget vide</span><span class="s" style="display:block;white-space:normal">Vous décrivez vos comptes, les catégories sont déjà prêtes.</span></span>${ic('r', 18)}</button>
  ${state._loadError ? `<p class="alert c">Les données v2 de cet appareil n’ont pas pu être lues (${esc(state._loadError)}).</p>` : ''}</main></div>`;
}

/* ---------- Fenêtres (bas d'écran) ---------- */
const sheet = { el: null, acts: {}, onClose: null };
function openSheet(title, body, foot, acts = {}, opts = {}) {
  const d = $('#sheet'); sheet.acts = acts; sheet.onClose = opts.onClose || null; sheet.inputs = {}; sheet.changes = {}; sheet.afterPress = null;
  d.innerHTML = `<div class="sheet-in"><div class="sheet-head">${opts.back ? `<button class="x" data-act="${opts.back}" aria-label="Retour" style="background:none">${ic('l', 20, 2.2)}</button>` : ''}<h2>${title}</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x', 18, 2.2)}</button></div><form class="sheet-body" id="sf" onsubmit="return false" novalidate>${body}</form>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div>`;
  if (!d.open) d.showModal();
  d.querySelector('.sheet-body').scrollTop = 0;
  if (opts.focus) setTimeout(() => d.querySelector(opts.focus)?.focus(), 80);
}
function closeSheet() { const d = $('#sheet'); if (d.open) d.close(); sheet.acts = {}; }
$('#sheet').addEventListener('click', e => { if (e.target === $('#sheet')) closeSheet(); });
$('#sheet').addEventListener('close', () => { sheet.onClose?.(); sheet.onClose = null; });
const sf = () => $('#sf');
const val = n => sf()?.elements[n]?.value ?? '';
const pressed = (group, v) => sf().querySelectorAll(`[data-group="${group}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
const getPressed = group => sf().querySelector(`[data-group="${group}"][aria-pressed="true"]`)?.dataset.v || '';

/* Menu « + » */
function addMenu() {
  const big = (form, cls, icon, t, s) => `<button class="card row-item" data-act="form" data-form="${form}" style="background:${cls};border:0;min-height:76px"><span class="ico" style="background:#fff">${ic(icon, 20)}</span><span class="grow"><span class="t" style="display:block;font-size:17px">${t}</span><span class="s" style="display:block">${s}</span></span></button>`;
  openSheet('Ajouter', `<div class="grid2">${big('expense', 'var(--coral-l)', 'minus', 'Dépense', 'Achat, facture')}${big('income', 'var(--pos-l)', 'plus', 'Revenu', 'Salaire, pension…')}</div><div class="sec">Raccourcis</div><div class="card list" style="padding:0">
  ${[['bungalow', 'house', 'Revenu bungalow', 'Direct, Airbnb ou Booking, avec la commission'], ['sale', 'leaf', 'Vente diverse', 'Objets, plantes, brocante'], ['transfer', 'transfer', 'Virement entre mes comptes', 'Ne compte pas dans le budget'], ['schedule', 'cal', 'Nouvelle échéance', 'Prélèvement, crédit, salaire qui revient']].map(([f, i, t, s]) => `<button class="row-item" data-act="form" data-form="${f}"><span class="ico">${ic(i, 20)}</span><span class="grow"><span class="t" style="display:block">${t}</span><span class="s" style="display:block">${s}</span></span>${ic('r', 18)}</button>`).join('')}</div>`, '');
}

/* Dépense / revenu en 4 champs */
function txForm(type, opts = {}) {
  const t = opts.tx; const isEdit = !!t;
  type = t ? t.type : type;
  const cat = t?.category || opts.category || '';
  const acc = t?.account || opts.account || defaultAccountId();
  const deferredTx = t && isDeferredAcc(accountById(t.account));
  const pay = t ? (t.payment === 'deferred' ? 'card' : (t.payment === 'card' || t.payment === 'immediate') ? (deferredTx ? 'cardNow' : 'card') : t.payment) : (type === 'income' ? 'transfer' : 'card');
  const date = t?.date || opts.date || today();
  const payOptsFor = accId => { const o = type === 'income' ? [['transfer', 'Virement'], ['cash', 'Espèces'], ['cheque', 'Chèque']] : isDeferredAcc(accountById(accId)) ? [['card', 'Carte différée'], ['cardNow', 'Carte immédiate'], ['directDebit', 'Prélèvement / virement'], ['cash', 'Espèces']] : [['card', 'Carte'], ['directDebit', 'Prélèvement / virement'], ['cash', 'Espèces']]; if (t && !o.some(p => p[0] === pay) && pay !== 'cardNow' && pay !== 'card') o.push([pay, payLabel(pay)]); return o; };
  const payButtons = (accId, sel) => { const o = payOptsFor(accId); if (!o.some(p => p[0] === sel)) sel = sel === 'cardNow' ? 'card' : o[0][0]; return `<div class="opts" id="payBox" style="${o.length === 4 ? 'grid-template-columns:repeat(2,minmax(0,1fr))' : ''}">${o.map(([v, l]) => `<button type="button" class="opt" data-group="pay" data-v="${v}" aria-pressed="${v === sel}">${l}</button>`).join('')}</div>`; };
  const title = isEdit ? (t.treatment === 'transfer' ? 'Virement' : type === 'income' ? 'Revenu' : 'Dépense') : type === 'income' ? 'Nouveau revenu' : 'Nouvelle dépense';
  const body = `${isEdit ? '' : `<div class="seg light" role="group" aria-label="Type" style="margin:0 auto;width:240px"><button type="button" data-act="switch-type" data-v="expense" aria-pressed="${type === 'expense'}">Dépense</button><button type="button" data-act="switch-type" data-v="income" aria-pressed="${type === 'income'}">Revenu</button></div>`}
  <label style="display:flex;flex-direction:column;align-items:center"><span class="label">Montant</span><input name="amount" class="amount-in ${type === 'income' ? 'inc' : ''}" inputmode="decimal" autocomplete="off" placeholder="0,00 €" value="${t ? amountInput(t.amount) : opts.amount ? amountInput(opts.amount) : ''}"></label>
  <label class="f">${type === 'income' ? 'De qui / quoi ?' : 'Où / quoi ?'}<input name="label" list="labelsList" autocomplete="off" value="${esc(t?.label || opts.label || '')}" placeholder="${type === 'income' ? 'Ex. Pension, remboursement…' : 'Ex. Intermarché, pharmacie…'}"><datalist id="labelsList">${recentLabels(type).map(l => `<option value="${esc(l)}">`).join('')}</datalist></label>
  <input type="hidden" name="category" value="${esc(cat)}"><input type="hidden" name="subcategory" value="${esc(t?.subcategory || opts.subcategory || '')}">
  <fieldset><legend>Catégorie <span id="guessNote" class="tiny" style="font-weight:500;color:var(--pos)"></span></legend><div id="catBox"></div></fieldset>
  <fieldset><legend>${type === 'income' ? 'Reçu par' : 'Payé avec'}</legend>${payButtons(acc, pay)}</fieldset>
  <div id="payInfo"></div>
  <details class="more" ${isEdit || opts.open ? 'open' : ''}><summary><span><span id="whenWhere">${date === today() ? 'Aujourd’hui' : dateFR(date)} · ${esc(accName(acc))}</span> <span class="link">Changer, plus d’options</span></span>${ic('down', 18)}</summary><div>
   <div class="grid2"><label class="f">Date<input type="date" name="date" value="${date}"></label><label class="f">Compte<select name="account">${accOptions(acc)}</select></label></div>
   <label class="f">Note<input name="note" value="${esc(t?.note || '')}" placeholder="Facultatif"></label>
   ${type === 'expense' ? `<label class="toggle"><input type="checkbox" name="split" ${t?.splits?.length ? 'checked' : ''}> Répartir sur plusieurs catégories (ticket mixte)</label><div id="splitBox"></div>` : ''}
   <label class="toggle"><input type="checkbox" name="nextMonth" ${t?.budgetMonth && t.budgetMonth > t.date.slice(0, 7) ? 'checked' : ''}> Compter dans le budget du mois suivant</label>
   <label class="toggle"><input type="checkbox" name="planned" ${t && isPlanned(t) ? 'checked' : ''}> Prévue : pas encore passée sur le compte</label>
   ${isEdit ? '' : `<label class="toggle"><input type="checkbox" name="repeat"> Revient chaque mois : en faire une échéance</label>`}
  </div></details>`;
  const foot = (isEdit ? `<button class="btn danger" data-act="del" aria-label="Supprimer">${ic('trash', 18)}</button>` : '') + `<button class="btn full" data-act="save">${isEdit ? 'Enregistrer' : type === 'income' ? 'Enregistrer le revenu' : 'Enregistrer la dépense'}</button>`;
  const F = { type, splits: t?.splits ? t.splits.map(l => ({ ...l })) : null, guessed: false };
  const drawCats = () => {
    const cur = val('category'); const guess = guessCategory(val('label'), type);
    const chips = [...new Set([cur, guess?.category, ...topCategories(type, 4), ...(type === 'income' ? ['Pension', 'Salaire', 'Revenus divers', 'Bungalow · Revenus', 'Ventes diverses'] : ['Alimentation', 'Voiture & transport', 'Santé et mutuelle', 'Entretien de la maison', 'Loisirs et passions'])].filter(c => c && catByName(c) && !catByName(c).hidden))].slice(0, 6);
    const c = catByName(cur);
    $('#catBox').innerHTML = `<div class="pills">${chips.map(n => `<button type="button" class="pill" data-act="pick-cat" data-v="${esc(n)}" aria-pressed="${n === cur}">${esc(n)}</button>`).join('')}<button type="button" class="pill more" data-act="all-cats">Autre…</button></div>
     <select id="allCats" class="in" style="display:none;margin-top:8px" data-change="pick-cat-sel" aria-label="Toutes les catégories"><option value="">Choisir une catégorie…</option>${catOptions(cur, type)}</select>
     ${c?.subs?.length ? `<div class="pills" style="margin-top:10px">${c.subs.map(s => `<button type="button" class="pill s" data-act="pick-sub" data-v="${esc(s)}" aria-pressed="${s === val('subcategory')}">${esc(s)}</button>`).join('')}</div>` : ''}`;
  };
  const drawPay = () => {
    const a = accountById(val('account') || acc);
    if (type === 'expense' && $('#payBox').children.length !== payOptsFor(a?.id).length) $('#payBox').outerHTML = payButtons(a?.id, getPressed('pay'));
    const p = getPressed('pay');
    $('#payInfo').innerHTML = type === 'expense' && p === 'card' && isDeferredAcc(a) ? `<div class="alert">${ic('card', 20)}<span>Carte différée de <b>${esc(a.name)}</b> : débitée le <b>${dateFR(dueDateFor(a, val('date') || date)).slice(0, 5)}</b> avec les autres achats du mois. Déjà débité ? Choisissez « Carte immédiate ».</span></div>` : type === 'expense' && p === 'cardNow' ? `<div class="alert">${ic('card', 20)}<span>Débité le jour même (${dateFR(val('date') || date).slice(0, 5)}) sur <b>${esc(a?.name || '')}</b>. À utiliser aussi pour un débit global de carte déjà passé dont les achats ne sont pas saisis.</span></div>` : '';
    $('#whenWhere').textContent = (val('date') === today() ? 'Aujourd’hui' : dateFR(val('date'))) + ' · ' + accName(val('account'));
  };
  const drawSplits = () => {
    const box = $('#splitBox'); if (!box) return;
    if (!sf().elements.split.checked) { box.innerHTML = ''; F.splits = null; return; }
    if (!F.splits?.length) F.splits = [{ label: '', category: val('category') || 'Alimentation', subcategory: '', amount: parseAmount(val('amount')) || 0 }, { label: '', category: 'Entretien de la maison', subcategory: '', amount: 0 }];
    const sum = F.splits.reduce((a, l) => a + (l.amount || 0), 0), total = parseAmount(val('amount')) || 0;
    box.innerHTML = F.splits.map((l, i) => `<div class="split-line"><select data-change="split-cat" data-i="${i}" aria-label="Catégorie ligne ${i + 1}">${catOptions(l.category, 'expense')}</select><input data-input="split-amt" data-i="${i}" inputmode="decimal" value="${l.amount ? amountInput(l.amount) : ''}" placeholder="0,00" aria-label="Montant ligne ${i + 1}"><button type="button" class="x" data-act="split-del" data-i="${i}" aria-label="Retirer la ligne">${ic('x', 14)}</button></div>`).join('') + `<div class="head small"><button type="button" class="link" data-act="split-add">+ Ajouter une ligne</button><span class="${sum === total ? 'pos b' : 'neg b'}">${sum === total ? 'Total juste ✓' : 'Reste ' + money(total - sum)}</span></div>`;
  };
  const acts = {
    'switch-type': b => { const cur = { amount: parseAmount(val('amount')), label: val('label') }; txForm(b.dataset.v, { ...opts, amount: cur.amount || undefined, label: cur.label }); },
    'pick-cat': b => { sf().elements.category.value = b.dataset.v; sf().elements.subcategory.value = ''; $('#guessNote').textContent = ''; drawCats(); },
    'all-cats': () => { const s = $('#allCats'); s.style.display = 'block'; s.focus(); },
    'pick-sub': b => { const cur = val('subcategory'); sf().elements.subcategory.value = cur === b.dataset.v ? '' : b.dataset.v; drawCats(); },
    'split-add': () => { F.splits.push({ label: '', category: 'Autres', subcategory: '', amount: 0 }); drawSplits(); },
    'split-del': b => { F.splits.splice(Number(b.dataset.i), 1); if (!F.splits.length) sf().elements.split.checked = false; drawSplits(); },
    save: () => {
      try {
        const e = sf().elements;
        if (!e.category.value) { const g = guessCategory(e.label.value, type); e.category.value = g?.category || 'Autres'; }
        const f = { id: t?.id, type, account: e.account.value, date: e.date.value, amount: e.amount.value, label: e.label.value, category: e.category.value, subcategory: e.subcategory.value, note: e.note.value, payment: getPressed('pay'), planned: e.planned.checked, budgetMonth: e.nextMonth.checked ? addMonths(e.date.value.slice(0, 7), 1) : '' };
        if (F.splits && e.split?.checked) f.splits = F.splits.filter(l => l.amount > 0).map(l => ({ label: l.label || l.category, category: l.category, subcategory: l.subcategory || '', amount: l.amount }));
        if (t) for (const k of ['recurringId', 'recurringDate', 'importId', 'groupId', 'treatment', 'transferId', 'chequeNumber']) if (t[k]) f[k] = t[k];
        if (t?.payment === 'deferred' && f.payment === 'card' && t.account === f.account && t.date === f.date) f.dueDate = t.dueDate;
        const n = buildTx(f);
        if (t?.transferId) { for (const o of state.transactions.filter(x => x.transferId === t.transferId && x.id !== t.id)) { o.amount = n.amount; o.date = n.date; o.label = n.label; } }
        upsertTx(n);
        if (e.repeat?.checked) state.schedules.push({ id: uid(), label: n.label, amount: n.amount, type: n.type, account: n.account, category: n.category, subcategory: n.subcategory || '', payment: n.payment === 'deferred' ? 'card' : n.payment, day: Number(n.date.slice(8)), every: 1, start: addMonths(n.date.slice(0, 7), 1), end: '', nextMonthBudget: !!n.budgetMonth, skip: [] });
        const c = catByName(n.category); if (n.subcategory && c && !c.subs.includes(n.subcategory)) c.subs.push(n.subcategory);
        save(); closeSheet(); render(); toast(isEdit ? 'Modifié' : (n.type === 'income' ? 'Revenu' : 'Dépense') + ' enregistré' + (n.type === 'income' ? '' : 'e') + (n.payment === 'deferred' ? ' · débit le ' + dateFR(n.dueDate).slice(0, 5) : ''));
      } catch (err) { alert(err.message); }
    },
    del: () => { if (!confirm('Supprimer « ' + t.label + ' » ?' + (t.transferId ? '\nLes deux côtés du virement seront supprimés.' : ''))) return; deleteTx(t.id); save(); closeSheet(); render(); toast('Supprimé'); }
  };
  openSheet(title, body, foot, acts, { focus: isEdit ? null : '[name=amount]' });
  sheet.inputs = {
    label: () => { if (!t && !F.touchedCat) { const g = guessCategory(val('label'), type); if (g && g.category !== val('category')) { sf().elements.category.value = g.category; sf().elements.subcategory.value = g.subcategory; $('#guessNote').textContent = '· devinée d’après « ' + val('label') + ' »'; drawCats(); } } },
    amount: () => { if (F.splits) drawSplits(); },
    'split-amt': el => { F.splits[Number(el.dataset.i)].amount = parseAmount(el.value) || 0; const s = F.splits.reduce((a, l) => a + l.amount, 0), tot = parseAmount(val('amount')) || 0; const span = $('#splitBox .head span'); if (span) { span.className = s === tot ? 'pos b' : 'neg b'; span.textContent = s === tot ? 'Total juste ✓' : 'Reste ' + money(tot - s); } }
  };
  sheet.changes = {
    'pick-cat-sel': el => { if (!el.value) return; F.touchedCat = true; sf().elements.category.value = el.value; sf().elements.subcategory.value = ''; drawCats(); },
    'split-cat': el => { F.splits[Number(el.dataset.i)].category = el.value; },
    any: el => { if (['account', 'date'].includes(el.name)) drawPay(); if (el.name === 'split') drawSplits(); }
  };
  sheet.afterPress = g => { if (g === 'pay') drawPay(); };
  const orig = acts['pick-cat']; acts['pick-cat'] = b => { F.touchedCat = true; orig(b); };
  drawCats(); drawPay(); drawSplits();
}

/* Revenu bungalow : brut + commission → 2 opérations */
function bungalowForm() {
  const rates = state.settings.bungalowRates; const acc = defaultAccountId();
  const body = `<fieldset><legend>Canal de réservation</legend><div class="seg light">${CHANNELS.map((c, i) => `<button type="button" data-group="chan" data-v="${c}" aria-pressed="${i === 1}">${c === 'Location en direct' ? 'En direct' : c}</button>`).join('')}</div></fieldset>
  <div class="grid2"><label class="f">Arrivée<input type="date" name="from" value="${today()}"></label><label class="f">Départ<input type="date" name="to" value=""></label></div><div class="tiny" id="nights" style="margin-top:-8px"></div>
  <label class="f">Montant payé par le voyageur (brut)<input name="gross" inputmode="decimal" placeholder="0,00 €" style="font:700 22px Outfit,sans-serif;color:var(--pos);height:54px"></label>
  <div class="grid2" id="comBox"><label class="f">Commission<input name="com" inputmode="decimal" placeholder="0,00 €"></label><label class="f">Versé le<input type="date" name="paid" value="${today()}"></label></div><div class="tiny" id="rateNote" style="margin-top:-8px"></div>
  <section id="recap" class="card" style="background:var(--bg);padding:14px"></section>
  <details class="more"><summary><span>${esc(accName(acc))} <span class="link">Changer, note</span></span>${ic('down', 18)}</summary><div><label class="f">Compte<select name="account">${accOptions(acc)}</select></label><label class="f">Note<input name="note" placeholder="Ex. famille Martin, 2 adultes"></label></div></details>`;
  let touched = false;
  const upd = () => {
    const ch = getPressed('chan'), direct = ch === 'Location en direct', g = parseAmount(val('gross')) || 0;
    $('#comBox').querySelector('label').style.display = direct ? 'none' : '';
    if (!direct && !touched) sf().elements.com.value = g ? amountInput(Math.round(g * (rates[ch] || 0) / 100)) : '';
    const c = direct ? 0 : parseAmount(val('com')) || 0;
    $('#rateNote').textContent = direct ? '' : 'Taux mémorisé pour ' + ch + ' : ' + (rates[ch] || 0) + ' % · ajustez selon votre relevé';
    const n = val('to') && val('from') ? Math.round((new Date(val('to')) - new Date(val('from'))) / 864e5) : 0;
    $('#nights').textContent = n > 0 ? n + ' nuit' + (n > 1 ? 's' : '') : '';
    $('#recap').innerHTML = `<div class="head"><span class="b">Net reçu sur le compte</span><span class="num b" style="font-size:22px">${money(g - c)}</span></div>${g ? `<div class="small" style="margin-top:6px">${c ? 'Deux opérations seront créées :' : 'Une opération sera créée :'}</div><div class="head small"><span>Bungalow · Revenus / ${esc(ch)}</span><span class="pos b">+${money(g)}</span></div>${c ? `<div class="head small"><span>Bungalow · Commissions / Commission ${esc(ch)}</span><span class="neg b">−${money(c)}</span></div>` : ''}` : ''}`;
  };
  openSheet('Revenu bungalow', body, `<button class="btn full" data-act="save">Enregistrer le séjour</button>`, {
    save: () => {
      try {
        const ch = getPressed('chan'), direct = ch === 'Location en direct', g = parseAmount(val('gross')), c = direct ? 0 : (parseAmount(val('com')) || 0);
        if (!g || g <= 0) throw Error('Indiquez le montant payé par le voyageur.');
        if (c >= g) throw Error('La commission doit être inférieure au montant brut.');
        const n = val('to') && val('from') ? Math.round((new Date(val('to')) - new Date(val('from'))) / 864e5) : 0;
        const date = val('paid') || today(), groupId = uid(), label = (direct ? 'Location directe' : ch) + (n > 0 ? ' · séjour ' + n + ' nuit' + (n > 1 ? 's' : '') : '') + (val('from') ? ' du ' + dateFR(val('from')).slice(0, 5) : '');
        state.transactions.push(buildTx({ type: 'income', account: val('account'), date, amount: g, label, category: 'Bungalow · Revenus', subcategory: ch, payment: 'transfer', note: val('note'), groupId }));
        if (c) state.transactions.push(buildTx({ type: 'expense', account: val('account'), date, amount: c, label: 'Commission ' + ch, category: 'Bungalow · Commissions', subcategory: 'Commission ' + ch, payment: 'transfer', groupId }));
        if (c && touched) rates[ch] = Math.round(c / g * 1000) / 10;
        save(); closeSheet(); render(); toast('Séjour enregistré · net ' + money(g - c));
      } catch (e) { alert(e.message); }
    }
  });
  sheet.inputs = { gross: upd, com: () => { touched = true; upd(); } };
  sheet.changes = { any: upd };
  sheet.afterPress = () => { touched = false; upd(); };
  upd();
}

function transferForm() {
  const accs = activeAccounts(); if (accs.length < 2) { alert('Il faut au moins deux comptes. Ajoutez-en un dans Plus › Mes comptes.'); return; }
  openSheet('Virement entre mes comptes', `<div class="grid2"><label class="f">Depuis<select name="from">${accOptions(defaultAccountId())}</select></label><label class="f">Vers<select name="to">${accOptions(accs.find(a => a.id !== defaultAccountId())?.id)}</select></label></div><label class="f">Montant<input name="amount" inputmode="decimal" placeholder="0,00 €" style="font:700 22px Outfit,sans-serif;height:54px"></label><div class="grid2"><label class="f">Date<input type="date" name="date" value="${today()}"></label><label class="f">Libellé<input name="label" placeholder="Facultatif"></label></div><p class="tiny" style="margin:0">Un virement entre vos comptes ne compte ni en dépense ni en revenu.</p>`, `<button class="btn full" data-act="save">Enregistrer le virement</button>`, {
    save: () => { try { createTransfer(val('from'), val('to'), val('date'), parseAmount(val('amount')), val('label').trim()); save(); closeSheet(); render(); toast('Virement enregistré'); } catch (e) { alert(e.message); } }
  }, { focus: '[name=amount]' });
}

/* Échéance en 4 champs */
const TEMPLATES = [
  ['Électricité', 'expense', 'Énergie et eau', 'Électricité'], ['Assurance', 'expense', 'Assurances', 'Habitation'], ['Téléphone', 'expense', 'Téléphone et internet', 'Mobile'], ['Box internet', 'expense', 'Téléphone et internet', 'Box internet'],
  ['Crédit', 'expense', 'Crédits', 'Crédit consommation'], ['Loyer', 'expense', 'Logement', 'Loyer ou crédit immobilier'], ['Mutuelle', 'expense', 'Santé et mutuelle', 'Mutuelle'], ['Salaire', 'income', 'Salaire', ''], ['Pension', 'income', 'Pension', 'Retraite de base']
];
function scheduleForm(s) {
  const isEdit = !!s; const acc = s?.account || defaultAccountId();
  s = s || { label: '', amount: 0, type: 'expense', account: acc, category: '', subcategory: '', payment: 'directDebit', day: Number(today().slice(8)), every: 1, start: thisMonth(), end: '', nextMonthBudget: false };
  const body = `${isEdit ? '' : `<fieldset><legend>Choisir un modèle <span class="tiny" style="font-weight:500">· ou écrire le vôtre</span></legend><div class="pills">${TEMPLATES.map(x => `<button type="button" class="pill s" data-act="tpl" data-v="${esc(x[0])}" aria-pressed="false">${x[1] === 'income' ? '+ ' : ''}${esc(x[0])}</button>`).join('')}</div></fieldset>`}
  <label class="f">Nom<input name="label" value="${esc(s.label)}" placeholder="Ex. EDF, crédit voiture…" autocomplete="off"></label>
  <div class="grid2"><label class="f">Montant<input name="amount" inputmode="decimal" value="${amountInput(s.amount)}" placeholder="0,00 €" style="font:700 18px Outfit,sans-serif"></label><label class="f">Le combien ?<select name="day">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${i + 1 === s.day ? 'selected' : ''}>le ${i + 1}${i + 1 === 31 ? ' (fin de mois)' : ''}</option>`).join('')}</select></label></div>
  <fieldset><legend>Tous les</legend><div class="seg light">${[[1, 'mois'], [3, 'trimestres'], [12, 'ans']].map(([v, l]) => `<button type="button" data-group="every" data-v="${v}" aria-pressed="${(s.every || 1) === v}">${l}</button>`).join('')}</div></fieldset>
  ${s.custom?.length ? `<p class="alert w">Cette échéance suit un calendrier précis repris de la version actuelle (${s.custom.length} dates). Les modifications de montant et de jour ne s’appliquent pas à ce calendrier.</p>` : ''}
  <div class="alert" id="schedSum"></div>
  <details class="more" ${isEdit ? 'open' : ''}><summary><span class="link">Modifier la catégorie, le compte, la date de fin</span>${ic('down', 18)}</summary><div>
   <div class="seg light"><button type="button" data-group="stype" data-v="expense" aria-pressed="${s.type === 'expense'}">Dépense</button><button type="button" data-group="stype" data-v="income" aria-pressed="${s.type === 'income'}">Revenu</button></div>
   <div class="grid2"><label class="f">Catégorie<select name="category">${catOptions(s.category, s.type)}</select></label><label class="f">Sous-catégorie<select name="subcategory"></select></label></div>
   <div class="grid2"><label class="f">Compte<select name="account">${accOptions(s.account)}</select></label><label class="f">Mode<select name="payment">${[['directDebit', 'Prélèvement'], ['transfer', 'Virement'], ['card', 'Carte'], ['cheque', 'Chèque'], ['cash', 'Espèces']].map(([v, l]) => `<option value="${v}" ${s.payment === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
   <div class="grid2"><label class="f">À partir de<input type="month" name="start" value="${s.start}"></label><label class="f">Dernière fois (facultatif)<input type="month" name="end" value="${s.end || ''}"></label></div>
   <label class="toggle"><input type="checkbox" name="nextMonth" ${s.nextMonthBudget ? 'checked' : ''}> Compte pour le budget du mois suivant (ex. pension versée en fin de mois)</label>
  </div></details>`;
  const drawSubs = () => { const c = catByName(val('category')); sf().elements.subcategory.innerHTML = '<option value="">—</option>' + (c?.subs || []).map(x => `<option ${x === s.subcategory ? 'selected' : ''}>${esc(x)}</option>`).join(''); };
  const drawSum = () => { const ty = getPressed('stype'), c = val('category'), sub = val('subcategory'); $('#schedSum').innerHTML = `<span>${ty === 'income' ? 'Revenu' : 'Dépense'} · <b>${esc(c)}${sub ? ' / ' + esc(sub) : ''}</b> · ${esc(accName(val('account')))} · ${payLabel(val('payment')).toLowerCase()}${sf().elements.nextMonth.checked ? ' · budget du mois suivant' : ''}</span>`; };
  const foot = (isEdit ? `<button class="btn danger" data-act="del" aria-label="Supprimer l’échéance">${ic('trash', 18)}</button>` : '') + `<button class="btn full" data-act="save">${isEdit ? 'Enregistrer' : 'Enregistrer l’échéance'}</button>`;
  openSheet(isEdit ? 'Modifier l’échéance' : 'Nouvelle échéance', body, foot, {
    tpl: b => { const x = TEMPLATES.find(x => x[0] === b.dataset.v); sf().querySelectorAll('[data-act=tpl]').forEach(p => p.setAttribute('aria-pressed', String(p === b))); const e = sf().elements; e.label.value = x[0]; pressed('stype', x[1]); e.category.innerHTML = catOptions(x[2], x[1]); e.category.value = x[2]; s.subcategory = x[3]; drawSubs(); e.payment.value = x[1] === 'income' ? 'transfer' : 'directDebit'; e.nextMonth.checked = x[0] === 'Pension'; drawSum(); e.amount.focus(); },
    save: () => {
      try {
        const e = sf().elements, amount = parseAmount(e.amount.value);
        if (!e.label.value.trim()) throw Error('Donnez un nom à l’échéance.');
        if (!amount || amount <= 0) throw Error('Indiquez le montant.');
        if (!validMonth(e.start.value)) throw Error('Mois de départ incorrect.');
        if (e.end.value && e.end.value < e.start.value) throw Error('La dernière fois est avant le début.');
        const n = { ...s, id: s.id || uid(), label: e.label.value.trim(), amount, type: getPressed('stype'), account: e.account.value, category: e.category.value, subcategory: e.subcategory.value, payment: e.payment.value, day: Number(e.day.value), every: Number(getPressed('every')) || 1, start: e.start.value, end: e.end.value || '', nextMonthBudget: e.nextMonth.checked, skip: s.skip || [] };
        if (n.splits?.length && n.splits.reduce((a, l) => a + l.amount, 0) !== n.amount) delete n.splits;
        const i = state.schedules.findIndex(x => x.id === n.id); if (i >= 0) state.schedules[i] = n; else state.schedules.push(n);
        save(); closeSheet(); render(); toast(isEdit ? 'Échéance modifiée' : 'Échéance créée : elle apparaîtra chaque ' + (n.every === 12 ? 'année' : n.every === 3 ? 'trimestre' : 'mois'));
      } catch (err) { alert(err.message); }
    },
    del: () => { if (!confirm('Supprimer l’échéance « ' + s.label + ' » ?\nLes opérations déjà enregistrées sont conservées.')) return; state.schedules = state.schedules.filter(x => x.id !== s.id); save(); closeSheet(); render(); toast('Échéance supprimée'); }
  }, { focus: isEdit ? null : '[name=label]' });
  sheet.changes = { any: el => { if (el.name === 'category') { s.subcategory = ''; drawSubs(); } drawSum(); } };
  sheet.inputs = {};
  sheet.afterPress = g => { if (g === 'stype') { const e = sf().elements; const cur = e.category.value; e.category.innerHTML = catOptions(cur, getPressed('stype')); drawSubs(); } drawSum(); };
  drawSubs(); drawSum();
}
function schedulesList() {
  const by = [...state.schedules].sort((a, b) => a.day - b.day);
  openSheet('Mes échéances', `<div class="card list" style="padding:0">${by.map(s => `<button class="row-item" data-act="edit-sched" data-id="${esc(s.id)}"><span class="day"><b>${s.day}</b>${s.every === 12 ? '/an' : s.every === 3 ? '/trim.' : '/mois'}</span><span class="grow"><span class="t" style="display:block">${esc(s.label)}</span><span class="s" style="display:block">${esc(s.category)}${showAccounts() ? ' · ' + esc(accName(s.account)) : ''}${s.end ? ' · jusqu’à ' + esc(monthLabel(s.end).toLowerCase()) : ''}</span></span><span class="amt ${s.type === 'income' ? 'pos' : 'neg'}">${s.type === 'income' ? '+' : '−'}${money(s.amount)}</span></button>`).join('')}</div>`, `<button class="btn full" data-act="new">${ic('plus', 18)} Nouvelle échéance</button>`, {
    'edit-sched': b => scheduleForm(state.schedules.find(x => x.id === b.dataset.id)), new: () => scheduleForm()
  });
}
/* Confirmer / corriger une échéance */
function dueSheet(d) {
  const t0 = today();
  openSheet(esc(d.label), `<div class="small">${esc(d.category)} · ${esc(accName(d.account))} · prévue le ${dateFR(d.date)}</div><label style="display:flex;flex-direction:column;align-items:center"><span class="label">Montant passé sur le compte</span><input name="amount" class="amount-in ${d.type === 'income' ? 'inc' : ''}" inputmode="decimal" value="${amountInput(d.amount)}"></label><label class="f">Date<input type="date" name="date" value="${d.date <= t0 ? d.date : t0}"></label>${d.sched ? `<label class="toggle"><input type="checkbox" name="keep"> Ce nouveau montant s’applique aussi aux prochains mois</label>` : ''}`,
    `${d.sched ? `<button class="btn ghost" data-act="skip">Pas ce mois-ci</button>` : `<button class="btn ghost" data-act="edit">Modifier</button>`}<button class="btn full" data-act="ok">${ic('check', 18, 2.6)} C’est passé</button>`, {
    ok: () => { const a = parseAmount(val('amount')); if (!a || a <= 0) return alert('Montant incorrect.'); if (d.sched && sf().elements.keep?.checked) d.sched.amount = a; confirmDue(d, a, val('date')); save(); closeSheet(); render(); toast('Enregistré'); },
    skip: () => { d.sched.skip = [...new Set([...(d.sched.skip || []), d.date.slice(0, 7)])]; save(); closeSheet(); render(); toast('Ignorée pour ' + monthLabel(d.date.slice(0, 7)).toLowerCase()); },
    edit: () => { closeSheet(); txForm(d.type, { tx: d.tx }); }
  }, { back: d.sched ? 'sched-edit' : null });
  sheet.acts['sched-edit'] = () => scheduleForm(d.sched);
}

/* Compte */
function accountFields(a, inline = false) {
  const tp = a.type || 'courant', card = a.card || 'immediate';
  return `<div class="grid2"><label class="f">Nom du compte<input name="name" value="${esc(a.name || '')}" placeholder="Ex. Compte joint" autocomplete="off"></label><label class="f">Banque<input name="bank" value="${esc(a.bank || '')}" placeholder="Ex. Crédit Agricole" autocomplete="off"></label></div>
  <fieldset style="margin-top:12px"><legend>Type</legend><div class="seg light">${[['courant', 'Courant'], ['epargne', 'Épargne'], ['especes', 'Espèces']].map(([v, l]) => `<button type="button" data-group="atype" data-v="${v}" aria-pressed="${tp === v}">${l}</button>`).join('')}</div></fieldset>
  <fieldset style="margin-top:12px"><legend>Carte bancaire</legend><div class="seg light">${[['immediate', 'Immédiate'], ['differee', 'Différée'], ['aucune', 'Aucune']].map(([v, l]) => `<button type="button" data-group="acard" data-v="${v}" aria-pressed="${card === v}">${l}</button>`).join('')}</div>
  <label class="toggle" id="debitRow" style="justify-content:space-between;${card === 'differee' ? '' : 'display:none'}">Débit de la carte le<select name="debitDay" class="in" style="width:auto;height:42px">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${(a.debitDay || 10) === i + 1 ? 'selected' : ''}>${i + 1} du mois suivant</option>`).join('')}</select></label></fieldset>
  <div class="grid2" style="margin-top:12px"><label class="f">${inline ? 'Solde actuel' : 'Solde de départ'}<input name="opening" inputmode="decimal" value="${a.opening != null ? amountInput(a.opening) : ''}" placeholder="0,00 €"></label><label class="f">À la date du<input type="date" name="start" value="${a.start || today()}"></label></div>`;
}
function accountForm(a) {
  const isEdit = !!a; const n = a ? state.transactions.filter(t => t.account === a.id).length : 0;
  const body = accountFields(a || {}) + (isEdit ? `<p class="tiny" style="margin:0">${n} opération${n > 1 ? 's' : ''} sur ce compte. Le solde de départ est le solde réel à la date indiquée ; les opérations suivantes s’y ajoutent.</p>
   <label class="toggle"><input type="checkbox" name="isDefault" ${state.settings.defaultAccount === a.id ? 'checked' : ''}> Compte proposé par défaut pour les nouvelles opérations</label>
   <div class="split" style="display:flex;flex-direction:column;gap:10px"><button type="button" class="btn ghost" data-act="archive">${a.archived ? 'Réactiver le compte' : 'Archiver · compte clôturé'}</button><p class="tiny" style="margin:-4px 0 0;text-align:center">Il disparaît des choix ; son historique reste dans les bilans.</p><button type="button" class="btn danger" data-act="delete">Supprimer le compte…</button></div>` : '');
  openSheet(isEdit ? 'Modifier le compte' : 'Nouveau compte', body, `<button class="btn full" data-act="save">Enregistrer</button>`, {
    save: () => {
      try {
        const e = sf().elements;
        const acc = makeAccount({ id: a?.id, name: e.name.value, bank: e.bank.value, type: getPressed('atype'), card: getPressed('acard'), debitDay: e.debitDay.value, opening: e.opening.value, start: e.start.value, archived: a?.archived });
        if (a) {
          const changedDay = a.card === 'differee' && acc.card === 'differee' && a.debitDay !== acc.debitDay, nowDeferred = a.card !== 'differee' && acc.card === 'differee', noLonger = a.card === 'differee' && acc.card !== 'differee';
          for (const t of state.transactions) if (t.account === a.id && t.type === 'expense') {
            if ((changedDay || noLonger) && t.payment === 'deferred' && t.dueDate > today()) { if (noLonger) { t.payment = 'card'; delete t.dueDate; } else t.dueDate = dueDateFor(acc, t.date); }
            if (nowDeferred && t.payment === 'card' && t.date >= today().slice(0, 7) + '-01') { t.payment = 'deferred'; t.dueDate = dueDateFor(acc, t.date); }
          }
          Object.assign(a, acc);
          if (e.isDefault?.checked) state.settings.defaultAccount = a.id; else if (state.settings.defaultAccount === a.id) delete state.settings.defaultAccount;
        } else state.accounts.push(acc);
        save(); closeSheet(); render(); toast('Compte enregistré');
      } catch (err) { alert(err.message); }
    },
    archive: () => { a.archived = !a.archived; if (a.archived && state.settings.defaultAccount === a.id) delete state.settings.defaultAccount; save(); closeSheet(); render(); toast(a.archived ? 'Compte archivé' : 'Compte réactivé'); },
    delete: () => {
      const others = state.accounts.filter(x => x.id !== a.id && !x.archived);
      if (!n) { if (!confirm('Supprimer le compte « ' + a.name + ' » ?')) return; state.accounts = state.accounts.filter(x => x.id !== a.id); state.schedules = state.schedules.filter(s => s.account !== a.id); save(); closeSheet(); render(); toast('Compte supprimé'); return; }
      openSheet('Supprimer « ' + esc(a.name) + ' »', `<p style="margin:0">Ce compte a <b>${n} opération${n > 1 ? 's' : ''}</b>. Que voulez-vous en faire ?</p>${others.length ? `<label class="f">Les déplacer vers<select name="to">${accOptions(others[0].id)}</select></label><button type="button" class="btn full" data-act="move">Déplacer puis supprimer le compte</button>` : ''}<button type="button" class="btn danger full" data-act="wipe">Tout supprimer (compte et opérations)</button><p class="tiny" style="margin:0">Pour un compte clôturé, « Archiver » est plus sûr : l’historique reste dans les bilans.</p>`, '', {
        move: () => { const to = val('to'); for (const t of state.transactions) if (t.account === a.id) t.account = to; for (const s of state.schedules) if (s.account === a.id) s.account = to; state.transactions = state.transactions.filter(t => !(t.transferId && state.transactions.filter(x => x.transferId === t.transferId).every(x => x.account === to))); state.accounts = state.accounts.filter(x => x.id !== a.id); save(); closeSheet(); render(); toast('Opérations déplacées, compte supprimé'); },
        wipe: () => { if (!confirm('Supprimer définitivement le compte et ses ' + n + ' opérations ?')) return; const tids = new Set(state.transactions.filter(t => t.account === a.id && t.transferId).map(t => t.transferId)); state.transactions = state.transactions.filter(t => t.account !== a.id && !tids.has(t.transferId)); state.schedules = state.schedules.filter(s => s.account !== a.id); state.accounts = state.accounts.filter(x => x.id !== a.id); save(); closeSheet(); render(); toast('Compte supprimé'); }
      });
    }
  });
  sheet.afterPress = g => { if (g === 'acard') $('#debitRow').style.display = getPressed('acard') === 'differee' ? '' : 'none'; };
}
/* Enveloppe */
function budgetSheet(cat) {
  const cats = visibleCategories('expense').filter(c => c.kind === 'out');
  openSheet(cat ? esc(cat) : 'Nouvelle enveloppe', `${cat ? '' : `<label class="f">Catégorie<select name="cat">${cats.map(c => `<option ${state.budgets[c.name] ? 'disabled' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`}<label class="f">Limite par mois<input name="v" inputmode="decimal" value="${cat && state.budgets[cat] ? amountInput(state.budgets[cat]) : ''}" placeholder="0,00 €" style="font:700 22px Outfit,sans-serif;height:54px"></label><p class="tiny" style="margin:0">Laissez vide pour retirer la limite.</p>`, `<button class="btn full" data-act="save">Enregistrer</button>`, {
    save: () => { const c = cat || val('cat'); const v = val('v') ? parseAmount(val('v')) : 0; if (isNaN(v) || v < 0) return alert('Montant incorrect.'); if (v) state.budgets[c] = v; else delete state.budgets[c]; save(); closeSheet(); render(); }
  }, { focus: '[name=v]' });
}
/* Catégorie */
function categoryForm(name) {
  const c = name ? catByName(name) : { name: '', group: 'perso', kind: 'out', subs: [], hidden: false };
  const used = name ? state.transactions.filter(t => parts(t).some(p => p.category === name)).length : 0;
  const body = `<label class="f">Nom<input name="name" value="${esc(c.name)}" autocomplete="off"></label>
  <div class="grid2"><label class="f">Groupe<select name="group">${[['perso', 'Vie courante'], ['bungalow', 'Bungalow'], ['ventes', 'Ventes diverses']].map(([v, l]) => `<option value="${v}" ${c.group === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="f">Plutôt<select name="kind"><option value="out" ${c.kind !== 'in' ? 'selected' : ''}>Dépense</option><option value="in" ${c.kind === 'in' ? 'selected' : ''}>Revenu</option></select></label></div>
  <fieldset><legend>Sous-catégories</legend><div class="pills" id="subs">${c.subs.map((s, i) => `<span class="pill s" style="display:inline-flex;align-items:center;gap:4px">${esc(s)}<button type="button" class="link" data-act="sub-del" data-i="${i}" aria-label="Retirer ${esc(s)}" style="padding:0 2px">${ic('x', 14)}</button></span>`).join('') || '<span class="tiny">Aucune</span>'}</div><div style="display:flex;gap:8px;margin-top:10px"><input class="in" name="newsub" placeholder="Nouvelle sous-catégorie"><button type="button" class="btn sm" data-act="sub-add">Ajouter</button></div></fieldset>
  ${name ? `<label class="toggle"><input type="checkbox" name="hidden" ${c.hidden ? 'checked' : ''}> Masquer (n’est plus proposée ; l’historique reste)</label><p class="tiny" style="margin:0">${used} opération${used > 1 ? 's' : ''} dans cette catégorie. Un nouveau nom est appliqué à toutes.</p>` : ''}`;
  const subs = [...c.subs];
  const draw = () => { $('#subs').innerHTML = subs.map((s, i) => `<span class="pill s" style="display:inline-flex;align-items:center;gap:4px">${esc(s)}<button type="button" class="link" data-act="sub-del" data-i="${i}" aria-label="Retirer ${esc(s)}" style="padding:0 2px">${ic('x', 14)}</button></span>`).join('') || '<span class="tiny">Aucune</span>'; };
  openSheet(name ? 'Catégorie' : 'Nouvelle catégorie', body, (name && !used ? `<button class="btn danger" data-act="del" aria-label="Supprimer">${ic('trash', 18)}</button>` : '') + `<button class="btn full" data-act="save">Enregistrer</button>`, {
    'sub-add': () => { const v = val('newsub').trim(); if (v && !subs.some(s => norm(s) === norm(v))) subs.push(v); sf().elements.newsub.value = ''; draw(); },
    'sub-del': b => { subs.splice(Number(b.dataset.i), 1); draw(); },
    save: () => {
      const nn = val('name').trim(); if (!nn) return alert('Donnez un nom.');
      if (nn !== name && state.categories.some(x => norm(x.name) === norm(nn))) return alert('Cette catégorie existe déjà.');
      if (name && nn !== name) { for (const t of state.transactions) { if (t.category === name) t.category = nn; for (const l of t.splits || []) if (l.category === name) l.category = nn; } for (const s of state.schedules) if (s.category === name) s.category = nn; if (state.budgets[name] != null) { state.budgets[nn] = state.budgets[name]; delete state.budgets[name]; } }
      const n = { name: nn, group: val('group'), kind: val('kind'), subs, hidden: !!sf().elements.hidden?.checked };
      if (name) Object.assign(c, n); else state.categories.push(n);
      save(); closeSheet(); render(); toast('Catégorie enregistrée');
    },
    del: () => { if (!confirm('Supprimer la catégorie « ' + name + ' » ?')) return; state.categories = state.categories.filter(x => x.name !== name); delete state.budgets[name]; save(); closeSheet(); render(); }
  });
}

/* Import CSV : aperçu puis confirmation */
function importPreview(fileName, accId, res) {
  const items = res.items, fresh = items.filter(i => !i.dup), dups = items.length - fresh.length, sett = fresh.filter(i => i.settlement).length;
  const dates = items.map(i => i.date).sort();
  const body = `<div class="card" style="background:var(--bg)"><div class="b">${esc(fileName)}</div><div class="small">${items.length ? 'Du ' + dateFR(dates[0]) + ' au ' + dateFR(dates[dates.length - 1]) : 'Aucune ligne lisible'} · compte ${esc(accName(accId))}</div><div class="grid3 split"><div><div class="tiny">Nouvelles</div><div class="b">${fresh.length}</div></div><div><div class="tiny">Déjà présentes</div><div class="b">${dups}</div></div><div><div class="tiny">Ignorées</div><div class="b">${res.skipped}</div></div></div></div>${fresh.some(i => i.due) ? `<p class="alert">${ic('check', 18)}<span>${fresh.filter(i => i.due).length} ligne(s) confirment des échéances prévues (EDF, crédit…) : elles ne seront pas comptées deux fois.</span></p>` : ''}${sett ? `<p class="alert">${ic('card', 18)}<span>${sett} débit${sett > 1 ? 's' : ''} global${sett > 1 ? 'aux' : ''} de carte différée reconnu${sett > 1 ? 's' : ''} : ${sett > 1 ? 'ils ne seront' : 'il ne sera'} pas compté${sett > 1 ? 's' : ''} deux fois.</span></p>` : ''}<div class="card list" style="padding:0">${fresh.slice(0, 25).map(i => `<div class="row-item"><span class="grow"><span class="t" style="display:block">${esc(i.label)}</span><span class="s" style="display:block">${dateFR(i.date)} · ${i.due ? '✓ confirme l’échéance « ' + esc(i.due.label) + ' »' : i.settlement ? 'débit global carte · déjà compté' : esc(i.category) + (i.subcategory ? ' / ' + esc(i.subcategory) : '')}</span></span><span class="amt ${i.settlement ? '' : i.type === 'income' ? 'pos' : 'neg'}">${i.type === 'income' ? '+' : '−'}${money(i.amount)}</span></div>`).join('')}</div>${fresh.length > 25 ? `<p class="tiny" style="margin:0">… et ${fresh.length - 25} autres.</p>` : ''}<p class="tiny" style="margin:0">Les catégories sont devinées d’après vos opérations précédentes ; les autres vont dans « Autres ». Vous pourrez annuler cet import depuis Sauvegardes.</p>`;
  openSheet('Importer le relevé', body, fresh.length ? `<button class="btn full" data-act="ok">Importer ${fresh.length} opération${fresh.length > 1 ? 's' : ''}</button>` : '', {
    ok: () => { const b = commitImport(fileName, accId, items); save(); closeSheet(); render(); toast(b.ids.length + ' opérations importées'); }
  });
}

/* ---------- Événements ---------- */
function act(name, b) {
  switch (name) {
    case 'tab': ui.tab = b.dataset.tab; ui.page = null; render(); scrollTo(0, 0); break;
    case 'page': ui.tab = 'plus'; ui.page = b.dataset.page; render(); scrollTo(0, 0); break;
    case 'back': ui.page = null; render(); break;
    case 'month': ui.month = addMonths(ui.month, Number(b.dataset.d)); render(); break;
    case 'year': ui.year += Number(b.dataset.d); render(); break;
    case 'group': ui.group = b.dataset.g; try { localStorage.setItem('mb2-ui-group', ui.group); } catch {} render(); break;
    case 'bilan-group': ui.bilanGroup = b.dataset.g; render(); break;
    case 'ops-filter': ui.ops = b.dataset.f; render(); break;
    case 'clear-q': ui.q = ''; render(); break;
    case 'add': addMenu(); break;
    case 'form': {
      const f = b.dataset.form;
      if (f === 'expense' || f === 'income') txForm(f, { category: b.dataset.cat });
      else if (f === 'sale') txForm('income', { category: 'Ventes diverses' });
      else if (f === 'bungalow') bungalowForm();
      else if (f === 'transfer') transferForm();
      else if (f === 'schedule') scheduleForm();
      else if (f === 'account') accountForm(b.dataset.id ? accountById(b.dataset.id) : null);
      else if (f === 'category') categoryForm(b.dataset.name);
      break;
    }
    case 'edit-tx': { const t = state.transactions.find(x => x.id === b.dataset.id); if (t) txForm(t.type, { tx: t }); break; }
    case 'due-open': { const d = dueList(ui.month, ui.acc).find(x => x.key === b.dataset.key); if (d) dueSheet(d); break; }
    case 'due-ok': { const d = dueList(ui.month, ui.acc).find(x => x.key === b.dataset.key); if (!d) break; confirmDue(d, d.amount, d.date <= today() ? d.date : today()); save(); render(); toast('✓ ' + d.label + ' enregistré'); break; }
    case 'sched-list': schedulesList(); break;
    case 'budget': budgetSheet(b.dataset.cat); break;
    case 'export-csv': download('mon-budget-v2-operations-' + today() + '.csv', exportCSV(), 'text/csv;charset=utf-8'); break;
    case 'export-json': download('mon-budget-v2-sauvegarde-' + today() + '.json', JSON.stringify(state, null, 1), 'application/json'); break;
    case 'undo-import': { const bt = state.imports.find(x => x.id === b.dataset.id); if (bt && confirm('Annuler l’import « ' + bt.name + ' » ? Ses ' + (bt.ids.length + (bt.restore?.length || 0)) + ' opérations seront retirées ou remises en « prévue ».')) { const n = undoImport(bt.id); save(); render(); toast(n + ' opérations retirées'); } break; }
    case 'copy-v1': {
      const v1 = readV1Local(); if (!v1) break;
      if (!isEmptyState(state) && !confirm('Remplacer les données v2 de cet appareil par une copie de la version actuelle ?')) break;
      try { const before = state; state = convertV1(v1); ui.onboard = null; save(); render(); toast('Données copiées : ' + state.transactions.length + ' opérations, ' + state.accounts.length + ' comptes'); if (before.accounts?.length) {} } catch (e) { alert(e.message); }
      break;
    }
    case 'history': {
      let h = []; try { h = JSON.parse(localStorage.getItem(KEY + '-history') || '[]'); } catch {}
      if (!h.length) { alert('Pas encore d’historique.'); break; }
      openSheet('Historique automatique', `<p class="small" style="margin:0">Les 5 derniers états enregistrés sur cet appareil.</p><div class="card list" style="padding:0">${h.map((x, i) => { let n = '?'; try { n = JSON.parse(x.data).transactions.length; } catch {} return `<button class="row-item" data-act="restore-h" data-i="${i}"><span class="grow"><span class="t" style="display:block">${new Date(x.at).toLocaleString('fr-FR')}</span><span class="s" style="display:block">${n} opérations</span></span><span class="link">Revenir</span></button>`; }).join('')}</div>`, '', {
        'restore-h': bb => { if (!confirm('Revenir à cet état ? L’état actuel sera gardé dans l’historique.')) return; try { state = validate(JSON.parse(h[Number(bb.dataset.i)].data)); save(); closeSheet(); render(); toast('État restauré'); } catch (e) { alert(e.message); } }
      });
      break;
    }
    case 'restore-preset': { let n = 0; for (const p of presetCategories()) { const c = catByName(p.name); if (!c) { state.categories.push(p); n++; } else { for (const s of p.subs) if (!c.subs.includes(s)) { c.subs.push(s); n++; } if (c.hidden) { c.hidden = false; n++; } } } save(); render(); toast(n ? n + ' éléments rajoutés' : 'Rien ne manquait'); break; }
    case 'reset': if (confirm('Effacer toutes les données v2 de cet appareil ?\nLa version actuelle n’est pas touchée. Les données v2 restent dans Google Drive si la sauvegarde était activée.') && confirm('Vraiment tout effacer ?')) { state = blank(); try { localStorage.removeItem(KEY); localStorage.removeItem('mon-budget-v2-sync'); } catch {} ui.tab = 'home'; ui.page = null; render(); } break;
    case 'onb-start': ui.onboard = 'accounts'; render(); scrollTo(0, 0); break;
    case 'onb-add': {
      const w = document.querySelector('.welcome'); const q = n => w.querySelector(`[name=${n}]`)?.value; const gp = g => w.querySelector(`[data-group="${g}"][aria-pressed="true"]`)?.dataset.v;
      try { const a = makeAccount({ name: q('name'), bank: q('bank'), type: gp('atype'), card: gp('acard'), debitDay: q('debitDay'), opening: q('opening'), start: q('start') }); state.accounts.push(a); if (!state.settings.defaultAccount) state.settings.defaultAccount = a.id; save({ silent: true }); render(); toast('Compte « ' + a.name + ' » ajouté'); } catch (e) { alert(e.message); }
      break;
    }
    case 'onb-done': if (state.accounts.length) { ui.onboard = null; save(); render(); toast('C’est prêt. Touchez + pour ajouter une opération.'); } break;
    case 'drive-start': window.driveStart ? window.driveStart() : alert('Google Drive n’est pas disponible.'); break;
    case 'sync-chip': window.driveChipClick?.(); break;
    case 'close': closeSheet(); break;
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  const g = e.target.closest('[data-group]');
  if (g && !b) { const root = g.closest('#sf') || g.closest('.welcome'); root.querySelectorAll(`[data-group="${g.dataset.group}"]`).forEach(x => x.setAttribute('aria-pressed', String(x === g))); if (g.dataset.group === 'acard') { const r = root.querySelector('#debitRow'); if (r) r.style.display = g.dataset.v === 'differee' ? '' : 'none'; } if (g.closest('#sf')) sheet.afterPress?.(g.dataset.group); return; }
  if (!b) return;
  const n = b.dataset.act;
  if (b.closest('#sheet') && sheet.acts[n]) { e.preventDefault(); sheet.acts[n](b); return; }
  if (n === 'close' || !b.closest('#sheet') || ['form', 'edit-tx'].includes(n)) { if (b.closest('#sheet') && n !== 'close') closeSheet(); act(n, b); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.closest('#sheet')) { const k = el.dataset.input || el.name; sheet.inputs?.[k]?.(el); return; }
  if (el.dataset.input === 'q') { ui.q = el.value; clearTimeout(act._q); act._q = setTimeout(() => { const pos = el.selectionStart; render(); const q = $('#q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 250); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.closest('#sheet')) { const k = el.dataset.change; if (k && sheet.changes?.[k]) sheet.changes[k](el); else sheet.changes?.any?.(el); return; }
  const k = el.dataset.change;
  if (k === 'acc') { ui.acc = el.value; render(); }
  if (k === 'import-csv' && el.files[0]) { const f = el.files[0], acc = $('#impAcc').value; f.text().then(txt => { let res; try { res = analyseCSV(txt, acc); } catch (err) { if (/�/.test(txt)) return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsText(f, 'windows-1252'); }).then(t2 => { try { importPreview(f.name, acc, analyseCSV(t2, acc)); } catch (e2) { alert(e2.message); } }); alert(err.message); return; } if (/�/.test(txt)) { const fr = new FileReader(); fr.onload = () => { try { importPreview(f.name, acc, analyseCSV(fr.result, acc)); } catch (e2) { alert(e2.message); } }; fr.readAsText(f, 'windows-1252'); return; } importPreview(f.name, acc, res); }); el.value = ''; }
  if (k === 'restore-json' && el.files[0]) { el.files[0].text().then(txt => { try { const d = JSON.parse(txt); const s = d.v === 2 ? validate(d) : convertV1(d); if (!confirm('Remplacer les données v2 de cet appareil par cette sauvegarde (' + s.transactions.length + ' opérations) ?')) return; state = s; ui.onboard = null; save(); render(); toast('Sauvegarde restaurée'); } catch (err) { alert('Restauration impossible : ' + err.message); } }); el.value = ''; }
});
onSavedHook = () => window.driveOnSaved?.();
render();
