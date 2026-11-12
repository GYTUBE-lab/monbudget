/* Mon Budget v2 — données et calculs
   Montants en centimes (entiers). Données séparées de la version actuelle. */
'use strict';
const KEY = 'mon-budget-v2', V1KEY = 'mon-budget-v1';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const thisMonth = () => today().slice(0, 7);
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); const s = MONTHS[m - 1]; return s[0].toUpperCase() + s.slice(1) + ' ' + y; };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const monthIndex = ym => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1; };
const lastDay = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const clampDay = (ym, day) => ym + '-' + pad(Math.min(Math.max(1, day || 1), lastDay(ym)));
const endOfMonth = ym => ym + '-' + pad(lastDay(ym));
const dateFR = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
const dayShort = d => ({ d: Number(d.slice(8, 10)), m: MONTHS_S[Number(d.slice(5, 7)) - 1] });
const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T12:00:00'));
const validMonth = m => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m);
const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const fmt0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const money = c => fmt.format((c || 0) / 100);
const moneyR = c => fmt0.format(Math.round((c || 0) / 100));
const signed = (c, type) => (type === 'income' ? '+' : '−') + money(c).replace('-', '');
function parseAmount(v) {
  if (typeof v === 'number') return Math.round(v * 100);
  let s = String(v || '').replace(/[\s  €]/g, '').replace(/^\+/, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  if (!/^-?\d+(\.\d{0,2})?\d*$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}
const amountInput = c => c ? (c / 100).toFixed(2).replace('.', ',') : '';
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/* ---------- Catégories proposées ---------- */
const SYSTEM = { transfer: 'Virements', settlement: 'Carte différée' };
const PRESET = [
  ['Alimentation', 'perso', 'out', ['Supermarché', 'Marché / primeur', 'Boulangerie', 'Boucherie / poissonnerie', 'Restaurant', 'Plats à emporter']],
  ['Logement', 'perso', 'out', ['Loyer ou crédit immobilier', 'Charges de copropriété', 'Travaux']],
  ['Énergie et eau', 'perso', 'out', ['Électricité', 'Gaz', 'Eau', 'Bois / fioul']],
  ['Voiture & transport', 'perso', 'out', ['Carburant', 'Entretien / réparations', 'Contrôle technique', 'Péage / parking', 'Transports en commun']],
  ['Assurances', 'perso', 'out', ['Habitation', 'Auto', 'Prévoyance / vie']],
  ['Santé et mutuelle', 'perso', 'out', ['Médecin', 'Pharmacie', 'Dentiste', 'Optique', 'Mutuelle']],
  ['Téléphone et internet', 'perso', 'out', ['Box internet', 'Mobile']],
  ['Abonnements', 'perso', 'out', ['TV / streaming', 'Presse', 'Logiciels']],
  ['Entretien de la maison', 'perso', 'out', ['Bricolage', 'Jardin', 'Réparations', 'Produits ménagers']],
  ['Hygiène et soins', 'perso', 'out', ['Coiffeur', 'Produits d’hygiène']],
  ['Achats', 'perso', 'out', ['Vêtements', 'Maison / déco', 'Électroménager']],
  ['Loisirs et passions', 'perso', 'out', ['Sorties', 'Sport', 'Culture', 'Jardinage']],
  ['Vacances et voyages', 'perso', 'out', ['Transport', 'Hébergement', 'Activités']],
  ['Animaux', 'perso', 'out', ['Nourriture', 'Vétérinaire']],
  ['Cadeaux et dons', 'perso', 'out', ['Cadeaux', 'Dons à des associations']],
  ['Crédits', 'perso', 'out', ['Crédit consommation', 'Crédit auto']],
  ['Impôts', 'perso', 'out', ['Impôt sur le revenu', 'Taxe foncière']],
  ['Frais bancaires', 'perso', 'out', ['Cotisation carte', 'Agios', 'Commissions']],
  ['Pension', 'perso', 'in', ['Retraite de base', 'Retraite complémentaire']],
  ['Salaire', 'perso', 'in', []],
  ['Revenus divers', 'perso', 'in', ['Remboursements Sécu / mutuelle', 'Aides (CAF…)', 'Intérêts d’épargne', 'Remboursement d’impôt']],
  ['Bungalow · Revenus', 'bungalow', 'in', ['Location en direct', 'Booking', 'Airbnb', 'Ménage facturé', 'Taxe de séjour encaissée']],
  ['Bungalow · Commissions', 'bungalow', 'out', ['Commission Booking', 'Commission Airbnb', 'Frais de paiement']],
  ['Bungalow · Charges', 'bungalow', 'out', ['Ménage / blanchisserie', 'Linge et consommables', 'Électricité / eau', 'Internet', 'Assurance', 'Entretien / réparations', 'Équipement / mobilier', 'Annonces / photos', 'Taxe de séjour reversée', 'Taxe foncière (part bungalow)', 'CFE / comptable']],
  ['Ventes diverses', 'ventes', 'in', ['Objets d’occasion', 'Plantes', 'Vide-grenier / brocante', 'Leboncoin / Vinted']],
  ['Ventes · Frais', 'ventes', 'out', ['Frais de plateforme', 'Envois / emballages', 'Achat de plants, pots, terreau', 'Emplacement de brocante']],
  ['Autres', 'perso', 'out', []]
];
const CHANNELS = ['Location en direct', 'Airbnb', 'Booking'];
const presetCategories = () => [...PRESET.map(([name, group, kind, subs]) => ({ name, group, kind, subs: [...subs], hidden: false })), { name: SYSTEM.transfer, group: 'perso', kind: 'out', subs: [], hidden: true }, { name: SYSTEM.settlement, group: 'perso', kind: 'out', subs: [], hidden: true }];
const guessGroup = n => /^bungalow/i.test(n) ? 'bungalow' : /^ventes?/i.test(n) ? 'ventes' : 'perso';

/* ---------- État ---------- */
const blank = () => ({ v: 2, accounts: [], transactions: [], schedules: [], categories: presetCategories(), budgets: {}, imports: [], settings: { bungalowRates: { Airbnb: 15, Booking: 17 } }, createdAt: today() });
let state;
function validate(s) {
  if (!s || typeof s !== 'object' || s.v !== 2) throw Error('Ce fichier n’est pas une sauvegarde de Mon Budget v2.');
  for (const k of ['accounts', 'transactions', 'schedules', 'categories', 'imports']) { s[k] ||= []; if (!Array.isArray(s[k])) throw Error('Sauvegarde invalide (' + k + ').'); }
  s.budgets ||= {}; s.settings ||= {}; s.settings.bungalowRates ||= { Airbnb: 15, Booking: 17 };
  for (const a of s.accounts) if (!a || typeof a.id !== 'string' || typeof a.name !== 'string') throw Error('Compte invalide.');
  const ids = new Set(s.accounts.map(a => a.id));
  for (const t of s.transactions) {
    if (!t || typeof t.id !== 'string' || !['income', 'expense'].includes(t.type) || !validDate(t.date) || !Number.isSafeInteger(t.amount) || t.amount <= 0 || typeof t.label !== 'string' || typeof t.category !== 'string') throw Error('Opération invalide : ' + (t?.label || '?'));
    if (!ids.has(t.account)) throw Error('Opération liée à un compte inconnu : ' + t.label);
    if (t.payment === 'deferred' && !validDate(t.dueDate)) throw Error('Achat différé sans date de débit : ' + t.label);
  }
  for (const r of s.schedules) if (!r || typeof r.id !== 'string' || !Number.isSafeInteger(r.amount) || !validMonth(r.start) || !ids.has(r.account) || (r.type === 'transfer' && !ids.has(r.toAccount))) throw Error('Échéance invalide : ' + (r?.label || '?'));
  for (const name of [...new Set([...s.transactions.flatMap(t => [t.category, ...(t.splits || []).map(l => l.category)]), ...s.schedules.map(r => r.category)])])
    if (name && !s.categories.some(c => c.name === name)) s.categories.push({ name, group: guessGroup(name), kind: 'out', subs: [], hidden: false });
  return s;
}
function load() {
  try { const raw = localStorage.getItem(KEY); state = raw ? validate(JSON.parse(raw)) : blank(); }
  catch (e) { console.error(e); state = blank(); state._loadError = e.message; }
}
let onSavedHook = null;
function save(opts = {}) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev && !opts.noHistory) { const h = JSON.parse(localStorage.getItem(KEY + '-history') || '[]'); h.unshift({ at: new Date().toISOString(), data: prev }); localStorage.setItem(KEY + '-history', JSON.stringify(h.slice(0, 5))); }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { alert('Enregistrement impossible sur cet appareil (mémoire pleine ou navigation privée). Faites une sauvegarde depuis Plus › Sauvegardes.'); }
  if (onSavedHook && !opts.silent) onSavedHook();
}
const isEmptyState = s => !s?.transactions?.length && !s?.accounts?.length && !s?.schedules?.length;

/* ---------- Comptes ---------- */
const accountById = id => state.accounts.find(a => a.id === id);
const activeAccounts = () => state.accounts.filter(a => !a.archived);
const accName = id => accountById(id)?.name || 'Compte';
const isDeferredAcc = a => a && a.card === 'differee';
function dueDateFor(acc, date) { return clampDay(addMonths(date.slice(0, 7), 1), acc?.debitDay || 10); }
function defaultAccountId() {
  const d = state.settings.defaultAccount;
  if (d && accountById(d) && !accountById(d).archived) return d;
  return (activeAccounts().find(a => a.type === 'courant') || activeAccounts()[0])?.id || '';
}
function makeAccount(f) {
  const name = String(f.name || '').trim();
  if (!name || name.length > 60) throw Error('Donnez un nom au compte (60 caractères maximum).');
  if (state.accounts.some(a => a.id !== f.id && norm(a.name) === norm(name))) throw Error('Un compte porte déjà ce nom.');
  const opening = f.opening === '' || f.opening == null ? null : parseAmount(f.opening);
  if (opening !== null && isNaN(opening)) throw Error('Solde de départ incorrect.');
  if (!validDate(f.start)) throw Error('Date du solde incorrecte.');
  const debitDay = Math.min(31, Math.max(1, parseInt(f.debitDay, 10) || 10));
  return { id: f.id || 'acc-' + uid(), name, bank: String(f.bank || '').trim().slice(0, 60), type: ['courant', 'epargne', 'especes'].includes(f.type) ? f.type : 'courant', card: ['immediate', 'differee', 'aucune'].includes(f.card) ? f.card : 'immediate', debitDay, opening, start: f.start, archived: !!f.archived };
}

/* ---------- Opérations ---------- */
const isPlanned = t => t.status === 'planned';
const inBudget = t => !isPlanned(t) && t.treatment !== 'transfer' && t.treatment !== 'settlement';
const budgetMonthOf = t => t.budgetMonth || t.date.slice(0, 7);
const cashDate = t => t.payment === 'deferred' ? (t.dueDate || t.date) : t.date;
const cashDelta = t => t.treatment === 'settlement' ? 0 : (t.type === 'income' ? t.amount : -t.amount);
const parts = t => t.splits?.length ? t.splits.map(l => ({ category: l.category, subcategory: l.subcategory || '', amount: l.amount })) : [{ category: t.category, subcategory: t.subcategory || '', amount: t.amount }];
const catByName = n => state.categories.find(c => c.name === n);
const groupOf = n => catByName(n)?.group || guessGroup(n);
function balance(accId, at = today()) {
  const a = accountById(accId); if (!a || a.opening == null) return null;
  let b = a.opening;
  for (const t of state.transactions) if (t.account === accId && !isPlanned(t)) { const d = cashDate(t); if (d >= a.start && d <= at) b += cashDelta(t); }
  return b;
}
function holdings(at = today(), accFilter = '') {
  let total = 0, missing = 0;
  for (const a of activeAccounts()) { if (accFilter && a.id !== accFilter) continue; const b = balance(a.id, at); if (b === null) missing++; else total += b; }
  return { total, missing };
}
/* Revenus / dépenses du mois, par groupe (tout | perso | bungalow) */
function monthTotals(month, group = 'all', acc = '') {
  const r = { income: 0, expense: 0, byCat: {}, bySub: {} };
  for (const t of state.transactions) {
    if (!inBudget(t) || budgetMonthOf(t) !== month || (acc && t.account !== acc)) continue;
    for (const p of parts(t)) {
      const g = groupOf(p.category);
      if (group === 'perso' && g === 'bungalow') continue;
      if (group === 'bungalow' && g !== 'bungalow') continue;
      r[t.type] += p.amount;
      const k = t.type + '|' + p.category; r.byCat[k] = (r.byCat[k] || 0) + p.amount;
      const ks = k + '|' + p.subcategory; r.bySub[ks] = (r.bySub[ks] || 0) + p.amount;
    }
  }
  return r;
}
function monthTx(month, acc = '') {
  return state.transactions.filter(t => (t.date.startsWith(month) || (t.budgetMonth === month && !t.date.startsWith(month))) && (!acc || t.account === acc))
    .sort((a, b) => b.date.localeCompare(a.date) || (b._at || 0) - (a._at || 0));
}

/* ---------- Devine la catégorie d'après le libellé ---------- */
const NOISE = /\b(cb|carte|paiement|prlv|prelevement|sepa|vir|virement|inst|recu|emis|achat|du|le|la|les|de|des|fr|sas|sarl|x\d+|\d{2}[\/.]\d{2}([\/.]\d{2,4})?|\d+)\b/g;
const labelKey = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').replace(NOISE, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ');
const firstWord = k => k.split(' ')[0] || '';
function labelScore(a, b) {
  const ka = labelKey(a), kb = labelKey(b); if (!ka || !kb) return 0;
  if (ka === kb) return 3;
  if (Math.min(ka.length, kb.length) >= 3 && (ka.startsWith(kb) || kb.startsWith(ka))) return 2;
  const fa = firstWord(ka), fb = firstWord(kb);
  return fa.length >= 3 && fa === fb ? 1 : 0;
}
function guessCategory(label, type) {
  let best = null, bestScore = 0;
  const pool = [...state.transactions.filter(t => t.treatment !== 'transfer' && t.treatment !== 'settlement' && t.category !== 'Autres'), ...state.schedules.map(s => ({ ...s, date: s.start + '-01' }))];
  for (const t of pool) {
    if (type && t.type !== type) continue;
    const sc = labelScore(label, t.label);
    if (sc > bestScore || (sc && sc === bestScore && t.date > best.date)) { best = t; bestScore = sc; }
  }
  return best ? { category: best.category, subcategory: best.subcategory || '' } : null;
}
function recentLabels(type, n = 40) {
  const seen = new Map();
  for (const t of [...state.transactions].sort((a, b) => b.date.localeCompare(a.date))) {
    if (t.treatment === 'transfer' || t.treatment === 'settlement' || (type && t.type !== type)) continue;
    const k = norm(t.label); if (!seen.has(k)) seen.set(k, t.label); if (seen.size >= n) break;
  }
  return [...seen.values()];
}
function topCategories(type, n = 4) {
  const count = {};
  for (const t of state.transactions.slice(-400)) if (t.type === type && inBudget(t)) count[t.category] = (count[t.category] || 0) + 1;
  const visible = visibleCategories(type).map(c => c.name);
  return Object.keys(count).filter(c => visible.includes(c)).sort((a, b) => count[b] - count[a]).slice(0, n);
}
function visibleCategories(type) {
  const want = type === 'income' ? 'in' : 'out';
  const list = state.categories.filter(c => !c.hidden && !Object.values(SYSTEM).includes(c.name));
  return [...list.filter(c => c.kind === want), ...list.filter(c => c.kind !== want)];
}

/* ---------- Échéances (récurrences) ---------- */
function occurrences(s, month) {
  if (s.custom?.length) return s.custom.filter(x => x.date.startsWith(month)).map(x => ({ date: x.date, amount: x.amount }));
  if (month < s.start || (s.end && month > s.end)) return [];
  if ((monthIndex(month) - monthIndex(s.start)) % (s.every || 1) !== 0) return [];
  return [...new Set(schedDays(s).map(d => clampDay(month, d)))].map(date => ({ date, amount: s.amount }));
}
const schedDays = s => (s.days?.length ? s.days : [s.day || 1]).map(Number).sort((a, b) => a - b);
const daysLabel = s => { if (s.custom?.length) return s.custom.length + ' date' + (s.custom.length > 1 ? 's' : '') + ' précise' + (s.custom.length > 1 ? 's' : ''); const d = schedDays(s); return d.length === 1 ? 'le ' + d[0] : 'les ' + d.slice(0, -1).join(', ') + ' et ' + d[d.length - 1]; };
/* Une opération correspond à une occurrence : même mois si un seul jour, même date sinon */
const sameOcc = (s, t, date) => t.recurringId === s.id && (schedDays(s).length > 1 || s.custom?.length ? (t.recurringDate || t.date) === date : (t.recurringDate || t.date).slice(0, 7) === date.slice(0, 7)) && (s.type !== 'transfer' || t.type === 'expense');
const isDone = (s, date) => state.transactions.some(t => sameOcc(s, t, date) && !isPlanned(t));
const plannedFor = (s, date) => state.transactions.find(t => sameOcc(s, t, date) && isPlanned(t));
const isSkipped = (s, date) => (s.skip || []).includes(date) || ((s.skip || []).includes(date.slice(0, 7)) && schedDays(s).length === 1 && !s.custom?.length);
/* Liste de ce qui reste à passer dans le mois */
function dueList(month, acc = '') {
  const out = [];
  for (const s of state.schedules) {
    if (s.paused || (acc && s.account !== acc && s.toAccount !== acc)) continue;
    for (const o of occurrences(s, month)) {
      if (isSkipped(s, o.date) || isDone(s, o.date)) continue;
      const p = plannedFor(s, o.date);
      out.push({ key: 's:' + s.id + ':' + o.date, sched: s, tx: p, date: p?.date || o.date, amount: p?.amount || o.amount, type: s.type, label: s.label, account: s.account, toAccount: s.toAccount, category: s.type === 'transfer' ? SYSTEM.transfer : s.category });
    }
  }
  for (const t of state.transactions) if (isPlanned(t) && !t.recurringId && t.date.startsWith(month) && (!acc || t.account === acc))
    out.push({ key: 't:' + t.id, tx: t, date: t.date, amount: t.amount, type: t.type, label: t.label, account: t.account, category: t.category });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function doneList(month, acc = '') {
  return state.transactions.filter(t => t.recurringId && !isPlanned(t) && (t.recurringDate || t.date).startsWith(month) && (!acc || t.account === acc)).sort((a, b) => a.date.localeCompare(b.date));
}
/* Débits de carte différée tombant dans le mois */
function cardDues(month, acc = '') {
  const map = new Map();
  for (const t of state.transactions) {
    if (t.payment !== 'deferred' || isPlanned(t) || !t.dueDate?.startsWith(month) || (acc && t.account !== acc)) continue;
    const k = t.account + '|' + t.dueDate; const e = map.get(k) || { account: t.account, date: t.dueDate, amount: 0, count: 0 };
    e.amount += t.amount; e.count++; map.set(k, e);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
function pendingDeferred(acc = '') {
  const t0 = today();
  return state.transactions.filter(t => t.payment === 'deferred' && !isPlanned(t) && t.dueDate > t0 && (!acc || t.account === acc)).sort((a, b) => b.date.localeCompare(a.date));
}
/* Solde prévu en fin de mois (mois courant ou futur) */
function forecast(month, acc = '') { return forecastAt(endOfMonth(month), acc); }
/* Solde prévu à une date précise (échéances et carte différée comprises) */
function forecastAt(end, acc = '') {
  const month = end.slice(0, 7), cur = thisMonth();
  let total = 0, missing = 0;
  for (const a of activeAccounts()) { if (acc && a.id !== acc) continue; const b = balance(a.id, end); if (b === null) missing++; else total += b; }
  const has = id => { const a = accountById(id); return a && a.opening != null && !a.archived && (!acc || id === acc); };
  for (let m = cur; m <= month; m = addMonths(m, 1)) {
    for (const d of dueList(m)) {
      if (d.type === 'transfer') { if (d.date <= end) { if (has(d.account)) total -= d.amount; if (has(d.toAccount)) total += d.amount; } continue; }
      if (!has(d.account)) continue;
      const s = d.sched, a = accountById(d.account);
      const sign = d.type === 'income' ? 1 : -1;
      let cd = d.tx ? cashDate(d.tx) : d.date;
      if (!d.tx && s && s.payment === 'card' && isDeferredAcc(a)) cd = dueDateFor(a, d.date);
      if (cd <= end) total += sign * d.amount;
    }
    if (monthIndex(month) - monthIndex(m) > 24) break;
  }
  return { total, missing };
}
const prevDay = d => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() - 1); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
/* Prochain revenu prévu (échéance) après aujourd'hui */
function nextIncome(acc = '', from = today()) {
  for (let m = from.slice(0, 7), i = 0; i < 3; i++, m = addMonths(m, 1)) {
    const l = dueList(m, acc).filter(d => d.type === 'income' && d.date > from && (!acc || d.account === acc));
    if (l.length) return l[0];
  }
  return null;
}
/* Revenus / dépenses encore prévus (pas encore passés) qui comptent pour le budget du mois */
function monthPlanned(month, group = 'all', acc = '') {
  const r = { income: 0, expense: 0 };
  const add = d => {
    if (d.type === 'transfer' || (acc && d.account !== acc)) return;
    const g = groupOf(d.category);
    if (group === 'perso' && g === 'bungalow') return;
    if (group === 'bungalow' && g !== 'bungalow') return;
    r[d.type] += d.amount;
  };
  for (const d of dueList(month, acc)) if (!d.sched?.nextMonthBudget && !(d.tx?.budgetMonth && d.tx.budgetMonth !== month)) add(d);
  for (const d of dueList(addMonths(month, -1), acc)) if (d.sched?.nextMonthBudget) add(d);
  return r;
}

/* ---------- Création d'opérations ---------- */
function buildTx(f) {
  const acc = accountById(f.account); if (!acc) throw Error('Choisissez un compte.');
  const amount = typeof f.amount === 'number' ? f.amount : parseAmount(f.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw Error('Indiquez un montant supérieur à zéro.');
  if (!validDate(f.date)) throw Error('Date incorrecte.');
  const label = String(f.label || '').trim().slice(0, 100); if (!label) throw Error('Indiquez un libellé (où / quoi ?).');
  const category = f.category || 'Autres';
  const t = { id: f.id || uid(), account: acc.id, type: f.type === 'income' ? 'income' : 'expense', date: f.date, amount, label, category, _at: Date.now() };
  if (f.subcategory) t.subcategory = f.subcategory;
  if (f.note) t.note = String(f.note).slice(0, 500);
  const pay = f.payment || 'card';
  if (t.type === 'expense' && pay === 'card' && isDeferredAcc(acc)) { t.payment = 'deferred'; t.dueDate = f.dueDate && validDate(f.dueDate) ? f.dueDate : dueDateFor(acc, t.date); }
  else t.payment = pay === 'cardNow' ? 'card' : pay;
  if (f.planned) t.status = 'planned';
  if (f.budgetMonth && validMonth(f.budgetMonth) && f.budgetMonth !== t.date.slice(0, 7)) t.budgetMonth = f.budgetMonth;
  if (f.splits?.length) {
    const sum = f.splits.reduce((a, l) => a + l.amount, 0);
    if (sum !== amount) throw Error('Le détail fait ' + money(sum) + ' au lieu de ' + money(amount) + '.');
    t.splits = f.splits; t.category = f.splits[0].category; t.subcategory = f.splits[0].subcategory || undefined;
  }
  for (const k of ['recurringId', 'recurringDate', 'importId', 'groupId', 'treatment', 'transferId', 'chequeNumber']) if (f[k]) t[k] = f[k];
  return t;
}
function upsertTx(t) { const i = state.transactions.findIndex(x => x.id === t.id); if (i >= 0) state.transactions[i] = t; else state.transactions.push(t); }
function deleteTx(id) {
  const t = state.transactions.find(x => x.id === id); if (!t) return;
  const ids = new Set([id]);
  if (t.transferId) state.transactions.filter(x => x.transferId === t.transferId).forEach(x => ids.add(x.id));
  state.transactions = state.transactions.filter(x => !ids.has(x.id));
}
function createTransfer(from, to, date, amount, label) {
  if (!from || !to || from === to) throw Error('Choisissez deux comptes différents.');
  if (!validDate(date) || !Number.isSafeInteger(amount) || amount <= 0) throw Error('Montant ou date incorrect.');
  const transferId = uid(), out = [];
  for (const [account, type] of [[from, 'expense'], [to, 'income']]) {
    const t = { id: uid(), transferId, account, type, date, amount, label: label || 'Virement entre mes comptes', category: SYSTEM.transfer, treatment: 'transfer', payment: 'transfer', note: 'De ' + accName(from) + ' vers ' + accName(to), _at: Date.now() };
    state.transactions.push(t); out.push(t);
  }
  return out;
}
function confirmDue(d, amount, date) {
  if (d.tx) { d.tx.status = undefined; delete d.tx.status; d.tx.amount = amount; if (date) { d.tx.date = date; if (d.tx.payment === 'deferred') d.tx.dueDate = dueDateFor(accountById(d.tx.account), date); } return d.tx; }
  const s = d.sched;
  if (s.type === 'transfer') { const ts = createTransfer(s.account, s.toAccount, date || d.date, amount, s.label); ts.forEach(t => { t.recurringId = s.id; t.recurringDate = d.date; }); return ts[0]; }
  const t = buildTx({ account: s.account, type: s.type, date: date || d.date, amount, label: s.label, note: s.note, category: s.category, subcategory: s.subcategory, payment: s.payment || 'directDebit', splits: s.splits?.length && s.amount === amount ? s.splits : undefined, recurringId: s.id, recurringDate: d.date, budgetMonth: s.nextMonthBudget ? addMonths(d.date.slice(0, 7), 1) : undefined });
  state.transactions.push(t); return t;
}

/* ---------- Conversion depuis la version actuelle (v1) ---------- */
function convertV1(s1) {
  if (!s1 || !Array.isArray(s1.transactions)) throw Error('Données de la version actuelle illisibles.');
  const s = blank(); s.createdAt = today();
  const tx1 = s1.transactions;
  const ids = [...new Set(['main', ...Object.keys(s1.accounts || {}), ...tx1.map(t => t.account || 'main'), ...(s1.recurring || []).map(r => r.account)])].filter(Boolean);
  const kindMap = { current: 'courant', savings: 'epargne', cash: 'especes', revolut: 'courant' };
  for (const id of ids) {
    const c = (s1.accounts || {})[id] || {};
    if (id === 'second' && !c.name && !tx1.some(t => t.account === 'second') && c.opening == null) continue;
    const def = tx1.filter(t => (t.account || 'main') === id && t.payment === 'deferred' && t.dueDate);
    const days = {}; def.forEach(t => { const d = Number(t.dueDate.slice(8, 10)); days[d] = (days[d] || 0) + 1; });
    const debitDay = Number(Object.keys(days).sort((a, b) => days[b] - days[a])[0]) || 10;
    const type = kindMap[c.kind] || (id === 'second' ? 'courant' : 'courant');
    const hasDeferredRec = (s1.recurring || []).some(r => r.account === id && r.payment === 'deferred');
    s.accounts.push({ id, name: c.name || (id === 'main' ? 'Compte principal' : id === 'second' ? 'Second compte' : 'Compte'), bank: c.kind === 'revolut' ? (c.name || '') : '', type, card: def.length || hasDeferredRec ? 'differee' : type === 'courant' ? 'immediate' : 'aucune', debitDay, opening: Number.isSafeInteger(c.opening) ? c.opening : null, start: validDate(c.start) ? c.start : '2026-01-01', archived: false });
  }
  for (const t of tx1) {
    const n = { id: t.id, account: t.account || 'main', type: t.type, date: t.date, amount: t.amount, label: t.label || '(sans libellé)', category: t.category, payment: t.payment || 'immediate', _at: 0 };
    for (const k of ['subcategory', 'note', 'dueDate', 'treatment', 'status', 'budgetMonth', 'transferId', 'recurringId', 'recurringDate', 'importId', 'chequeNumber']) if (t[k] !== undefined && t[k] !== '' && t[k] !== null) n[k] = t[k];
    if (t.splits?.length) n.splits = t.splits.map(l => ({ label: l.label, category: l.category, subcategory: l.subcategory || '', amount: l.amount }));
    if (n.treatment === 'normal') delete n.treatment;
    if (n.status === 'realized') delete n.status;
    if (n.treatment === 'settlement') n.category = SYSTEM.settlement;
    if (n.treatment === 'transfer') n.category = SYSTEM.transfer;
    if (n.payment === 'deferred' && !validDate(n.dueDate)) n.payment = 'card';
    s.transactions.push(n);
  }
  const amountAt = (r, date) => [...(r.amountChanges || [])].sort((a, b) => a.date.localeCompare(b.date)).filter(x => x.date <= date).reduce((v, x) => x.amount, r.amount);
  const payMap = { immediate: 'directDebit', card: 'card', deferred: 'card', directDebit: 'directDebit', transfer: 'transfer', cheque: 'cheque', cash: 'cash' };
  for (const r of s1.recurring || []) {
    const n = { id: r.id, label: r.label, amount: amountAt(r, today()), type: r.type, account: r.account || 'main', category: r.category, subcategory: r.subcategory || '', payment: payMap[r.payment] || 'directDebit', day: r.day || 1, every: 1, start: (validDate(r.startDate) ? r.startDate : '2026-01-01').slice(0, 7), end: validDate(r.endDate) ? r.endDate.slice(0, 7) : '', nextMonthBudget: r.budgetOffset === 1, skip: [] };
    if (r.splits?.length) n.splits = r.splits.map(l => ({ label: l.label, category: l.category, subcategory: l.subcategory || '', amount: l.amount }));
    if (r.schedule?.length) n.custom = r.schedule.map(x => ({ date: x.date, amount: x.amount }));
    if (r.detail) n.note = r.detail;
    s.schedules.push(n);
  }
  /* Catégories : proposées + celles utilisées, en respectant les catégories masquées */
  const hidden = new Set((s1.lists?.hiddenCategories || []).map(norm));
  const used = new Set([...s.transactions.flatMap(t => [t.category, ...(t.splits || []).map(l => l.category)]), ...s.schedules.map(r => r.category), ...Object.keys(s1.budgets || {}).filter(c => s1.budgets[c] > 0)]);
  for (const name of used) if (name && !s.categories.some(c => c.name === name)) s.categories.push({ name, group: guessGroup(name), kind: s.transactions.some(t => t.category === name && t.type === 'income') ? 'in' : 'out', subs: [], hidden: hidden.has(norm(name)) && !s.transactions.some(t => t.category === name && t.date >= addMonths(thisMonth(), -3)) });
  for (const x of s1.lists?.subcategories || []) { const c = s.categories.find(c => c.name === x.category); if (c && !c.subs.some(v => norm(v) === norm(x.name))) c.subs.push(x.name); }
  for (const t of s.transactions) for (const p of parts(t)) { const c = s.categories.find(c => c.name === p.category); if (c && p.subcategory && !c.subs.some(v => norm(v) === norm(p.subcategory))) c.subs.push(p.subcategory); }
  for (const [c, v] of Object.entries(s1.budgets || {})) if (Number.isSafeInteger(v) && v > 0) s.budgets[c] = v;
  s.imports = (s1.imports || []).map(b => ({ id: b.id || uid(), name: b.name, account: b.account, ids: b.ids || [], at: b.at || '' }));
  const main = s.accounts.find(a => a.id === 'main'); if (main) s.settings.defaultAccount = 'main';
  s.convertedFromV1 = new Date().toISOString();
  return validate(s);
}
function readV1Local() { try { const raw = localStorage.getItem(V1KEY); if (!raw) return null; const s = JSON.parse(raw); return s?.transactions ? s : null; } catch { return null; } }

/* ---------- Import CSV du relevé bancaire ---------- */
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/).slice(0, 15).join('\n');
  const delim = [';', ',', '\t'].map(d => [d, (first.match(new RegExp(d === '\t' ? '\t' : '\\' + d, 'g')) || []).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
function csvDate(v) {
  v = String(v || '').trim();
  let m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + pad(m[2]) + '-' + pad(m[1]); }
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
  return '';
}
function analyseCSV(text, accId) {
  const rows = parseCSV(text);
  const find = (hdr, words) => hdr.findIndex(h => words.some(w => norm(h).includes(w)));
  let hi = -1, hdr = [];
  for (let i = 0; i < Math.min(rows.length, 30); i++) { const h = rows[i].map(norm); if (h.some(c => c.includes('date')) && h.some(c => /montant|debit|credit|amount|somme/.test(c))) { hi = i; hdr = rows[i]; break; } }
  if (hi < 0) throw Error('Colonnes non reconnues. Il faut au moins une colonne « Date » et une colonne « Montant », ou « Débit » et « Crédit ».');
  const cDate = (() => { const p = hdr.findIndex(h => /^date( de l.?operation| operation)?$/.test(norm(h))); return p >= 0 ? p : find(hdr, ['date']); })();
  const cLabel = find(hdr, ['libelle', 'description', 'beneficiaire', 'intitule', 'detail', 'operation', 'nature']);
  const cAmount = hdr.findIndex(h => /^(montant|amount|somme)/.test(norm(h)) && !/devise|currency/.test(norm(h)));
  const cDebit = find(hdr, ['debit']), cCredit = find(hdr, ['credit']);
  const cState = find(hdr, ['etat', 'state', 'statut']), cCur = find(hdr, ['devise', 'currency']);
  const cCat = hdr.findIndex(h => /^categorie|^category/.test(norm(h)));
  if (cAmount < 0 && (cDebit < 0 || cCredit < 0)) throw Error('Colonne de montant introuvable (« Montant », ou « Débit » et « Crédit »).');
  const acc = accountById(accId); const items = []; let skipped = 0;
  for (const r of rows.slice(hi + 1)) {
    const date = csvDate(r[cDate]); if (!date) { skipped++; continue; }
    if (cState >= 0 && r[cState] && !/termin|complet|valid/i.test(r[cState])) { skipped++; continue; }
    if (cCur >= 0 && r[cCur] && !/eur/i.test(r[cCur])) { skipped++; continue; }
    let v;
    if (cAmount >= 0) v = parseAmount(r[cAmount]);
    else { const d = parseAmount(r[cDebit]), c = parseAmount(r[cCredit]); v = (!isNaN(c) && c ? Math.abs(c) : 0) - (!isNaN(d) && d ? Math.abs(d) : 0); }
    if (isNaN(v) || v === 0) { skipped++; continue; }
    const label = (cLabel >= 0 ? r[cLabel] : '').replace(/\s+/g, ' ').trim() || 'Opération importée';
    const type = v > 0 ? 'income' : 'expense', amount = Math.abs(v);
    const dup = state.transactions.some(t => t.account === accId && t.date === date && t.amount === amount && t.type === type && norm(t.label) === norm(label));
    const g = guessCategory(label, type);
    const bankCat = cCat >= 0 ? (r[cCat] || '').trim() : '';
    const known = bankCat && state.categories.find(c => norm(c.name) === norm(bankCat));
    items.push({ date, label, type, amount, dup, category: g?.category || known?.name || 'Autres', subcategory: g?.subcategory || '', note: !g && bankCat && !known ? 'Catégorie banque : ' + bankCat : '' });
  }
  /* Rapproche les lignes des échéances prévues (évite de les compter deux fois) */
  const used = new Set();
  for (const it of items) {
    if (it.dup) continue;
    const m = it.date.slice(0, 7);
    const cands = [...dueList(m, accId), ...dueList(addMonths(m, -1), accId), ...dueList(addMonths(m, 1), accId)]
      .filter(d => !used.has(d.key) && (d.type === it.type || (d.type === 'transfer' && it.type === 'expense' && d.account === accId)) && Math.abs(new Date(d.date) - new Date(it.date)) <= 12 * 864e5 && (d.amount === it.amount || Math.abs(d.amount - it.amount) <= d.amount * 0.25) && labelScore(it.label, d.label) > 0)
      .sort((a, b) => Math.abs(a.amount - it.amount) - Math.abs(b.amount - it.amount));
    if (cands[0]) { const d = cands[0]; used.add(d.key); it.due = d; it.category = d.category; it.subcategory = d.sched?.subcategory || d.tx?.subcategory || ''; }
  }
  /* Repère le débit global de la carte différée (déjà compté via les achats) */
  if (isDeferredAcc(acc)) for (const it of items) {
    if (it.type !== 'expense' || it.dup || it.due) continue;
    const near = cardDues(it.date.slice(0, 7), accId).concat(cardDues(addMonths(it.date.slice(0, 7), -1), accId)).find(d => Math.abs(d.amount - it.amount) <= 1 && Math.abs(new Date(d.date) - new Date(it.date)) <= 8 * 864e5);
    if (near) { it.settlement = true; it.category = SYSTEM.settlement; it.note = 'Débit global de la carte (' + near.count + ' achats déjà saisis)'; }
  }
  return { items, skipped };
}
function commitImport(name, accId, items) {
  const batch = { id: uid(), name, account: accId, ids: [], restore: [], at: new Date().toISOString() };
  for (const it of items) {
    if (it.dup) continue;
    if (it.due) {
      const d = it.due;
      if (d.tx) { batch.restore.push(JSON.parse(JSON.stringify(d.tx))); delete d.tx.status; d.tx.amount = it.amount; d.tx.date = it.date; d.tx.importId = batch.id; if (d.tx.payment === 'deferred') d.tx.dueDate = dueDateFor(accountById(d.tx.account), it.date); }
      else { const t = confirmDue(d, it.amount, it.date); const all = t.transferId ? state.transactions.filter(x => x.transferId === t.transferId) : [t]; all.forEach(x => { x.importId = batch.id; batch.ids.push(x.id); }); }
      continue;
    }
    const t = { id: uid(), account: accId, type: it.type, date: it.date, amount: it.amount, label: it.label, category: it.category, payment: it.type === 'income' ? 'transfer' : 'directDebit', importId: batch.id, _at: Date.now() };
    if (it.subcategory) t.subcategory = it.subcategory;
    if (it.note) t.note = it.note;
    if (it.settlement) t.treatment = 'settlement';
    state.transactions.push(t); batch.ids.push(t.id);
  }
  state.imports.unshift(batch); state.imports = state.imports.slice(0, 30);
  return batch;
}
function undoImport(id) {
  const b = state.imports.find(x => x.id === id); if (!b) return 0;
  const ids = new Set(b.ids); const n = state.transactions.filter(t => ids.has(t.id)).length;
  state.transactions = state.transactions.filter(t => !ids.has(t.id));
  for (const old of b.restore || []) { const i = state.transactions.findIndex(t => t.id === old.id); if (i >= 0) state.transactions[i] = old; }
  state.imports = state.imports.filter(x => x.id !== id);
  return n + (b.restore || []).length;
}
function exportCSV() {
  const rows = [['Date', 'Compte', 'Type', 'Libellé', 'Catégorie', 'Sous-catégorie', 'Montant', 'Paiement', 'Débit carte', 'Statut', 'Note']];
  for (const t of [...state.transactions].sort((a, b) => a.date.localeCompare(b.date)))
    rows.push([dateFR(t.date), accName(t.account), t.treatment === 'transfer' ? 'Virement' : t.type === 'income' ? 'Revenu' : 'Dépense', t.label, t.category, t.subcategory || '', ((t.type === 'income' ? 1 : -1) * t.amount / 100).toFixed(2).replace('.', ','), t.payment || '', t.dueDate ? dateFR(t.dueDate) : '', isPlanned(t) ? 'Prévue' : '', t.note || '']);
  return '﻿' + rows.map(r => r.map(c => /[;"\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(';')).join('\r\n');
}
function download(name, content, type) {
  const blob = new Blob([content], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
load();

/* ---------- Saisie à la voix : « 64 euros 30 Intermarché carte » ---------- */
const SPOKEN_HINTS = [
  [/\b(courses?|supermarche|hypermarche|epicerie)\b/, 'Alimentation', 'Supermarché'], [/\b(boulangerie|pain|baguette)\b/, 'Alimentation', 'Boulangerie'], [/\b(restaurant|resto|brasserie|pizzeria)\b/, 'Alimentation', 'Restaurant'],
  [/\b(marche|primeur|legumes|fruits)\b/, 'Alimentation', 'Marché / primeur'], [/\b(essence|carburant|gasoil|gazole|diesel|plein)\b/, 'Voiture & transport', 'Carburant'], [/\b(peage|parking|stationnement)\b/, 'Voiture & transport', 'Péage / parking'],
  [/\b(garage|vidange|pneus?)\b/, 'Voiture & transport', 'Entretien / réparations'], [/\b(pharmacie|medicaments?)\b/, 'Santé et mutuelle', 'Pharmacie'], [/\b(medecin|docteur|consultation)\b/, 'Santé et mutuelle', 'Médecin'],
  [/\b(dentiste)\b/, 'Santé et mutuelle', 'Dentiste'], [/\b(coiffeur|coiffure)\b/, 'Hygiène et soins', 'Coiffeur'], [/\b(cinema|theatre|concert|musee)\b/, 'Loisirs et passions', 'Sorties'],
  [/\b(bricolage|quincaillerie)\b/, 'Entretien de la maison', 'Bricolage'], [/\b(jardinerie|jardin)\b/, 'Entretien de la maison', 'Jardin'], [/\b(vetements?|chaussures?)\b/, 'Achats', 'Vêtements'],
  [/\b(veterinaire)\b/, 'Animaux', 'Vétérinaire'], [/\b(croquettes)\b/, 'Animaux', 'Nourriture'], [/\b(cadeau)\b/, 'Cadeaux et dons', 'Cadeaux'],
  [/\b(electricite|edf)\b/, 'Énergie et eau', 'Électricité'], [/\b(gaz)\b/, 'Énergie et eau', 'Gaz'], [/\b(pension|retraite)\b/, 'Pension', ''], [/\b(salaire|paie)\b/, 'Salaire', ''],
  [/\b(airbnb)\b/, 'Bungalow · Revenus', 'Airbnb'], [/\b(booking)\b/, 'Bungalow · Revenus', 'Booking'], [/\b(plantes?|boutures?)\b/, 'Ventes diverses', 'Plantes'], [/\b(vide.grenier|brocante)\b/, 'Ventes diverses', 'Vide-grenier / brocante']
];
const MONTH_WORDS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const shiftDate = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
function parseSpoken(text, type) {
  const raw = String(text || '').trim(); let s = ' ' + norm(raw).replace(/€/g, ' euros ').replace(/\s+/g, ' ') + ' ';
  const r = { text: raw };
  /* Type */
  if (/\b(recu|revenu|rentree|rembourse(ment)?|vendu|vente|pension|salaire|retraite|airbnb|booking|loyer recu)\b/.test(s) && !/\b(depense|achete|paye)\b/.test(s)) r.type = 'income';
  else if (/\b(depense|achat|achete|paye)\b/.test(s)) r.type = 'expense';
  /* Date */
  const t0 = today();
  if (/\bavant[ -]hier\b/.test(s)) { r.date = shiftDate(t0, -2); s = s.replace(/\bavant[ -]hier\b/, ' '); }
  else if (/\bhier\b/.test(s)) { r.date = shiftDate(t0, -1); s = s.replace(/\bhier\b/, ' '); }
  else if (/\baujourd ?hui\b/.test(s)) { r.date = t0; s = s.replace(/\baujourd ?hui\b/, ' '); }
  else {
    const m = s.match(/\ble (\d{1,2}|1er|premier)(?: (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre))?\b/);
    if (m) {
      const day = /^(1er|premier)$/.test(m[1]) ? 1 : Number(m[1]);
      if (day >= 1 && day <= 31) {
        let ym = m[2] ? t0.slice(0, 4) + '-' + pad(MONTH_WORDS.indexOf(m[2]) + 1) : t0.slice(0, 7);
        let d = clampDay(ym, day); if (d > t0) { ym = m[2] ? (Number(ym.slice(0, 4)) - 1) + ym.slice(4) : addMonths(ym, -1); d = clampDay(ym, day); }
        r.date = d; s = s.replace(m[0], ' ');
      }
    }
  }
  /* Montant : « 64 euros 30 », « 64,30 », « 2 100 euros », « 12 euros et 50 centimes » */
  s = s.replace(/(\d)\s(\d{3})\b/g, '$1$2');
  let m = s.match(/(\d+)(?:[.,](\d{1,2}))?\s*euros?(?:\s*(?:et\s*)?(\d{1,2})(?:\s*centimes?)?\b)?/);
  if (!m) m = s.match(/(\d+)(?:[.,](\d{1,2}))?/);
  if (m) { const cents = m[2] || m[3] || ''; r.amount = Number(m[1]) * 100 + (cents ? Number(cents.padEnd(2, '0')) : 0); s = s.replace(m[0], ' '); }
  /* Paiement */
  const pays = [[/\bcarte (a debit )?differee?\b/, 'card'], [/\bcarte (a debit )?immediate?\b|\bdebit immediat\b/, 'cardNow'], [/\b(carte|cb|carte bleue|carte bancaire)\b/, 'card'], [/\b(especes|liquide|cash)\b/, 'cash'], [/\bcheque\b/, 'cheque'], [/\b(prelevement|preleve)\b/, 'directDebit'], [/\bvirement\b/, 'transfer']];
  for (const [re, v] of pays) if (re.test(s)) { r.payment = v; s = s.replace(re, ' '); break; }
  if (r.payment === 'transfer' && (r.type || type) !== 'income') r.payment = 'directDebit';
  /* Catégorie citée par son nom, puis indices */
  const plain = s;
  for (const c of state.categories) { if (c.hidden || Object.values(SYSTEM).includes(c.name)) continue; const sub = c.subs.find(x => norm(x).length > 3 && plain.includes(' ' + norm(x) + ' ')); if (sub) { r.category = c.name; r.subcategory = sub; break; } if (plain.includes(' ' + norm(c.name) + ' ')) { r.category = c.name; break; } }
  if (!r.category) for (const [re, c, sub] of SPOKEN_HINTS) if (re.test(plain) && catByName(c)) { r.category = c; r.subcategory = sub; break; }
  /* Libellé : ce qui reste, sans les petits mots */
  const words = raw.replace(/€/g, ' ').split(/\s+/).filter(w => { const n = norm(w).replace(/[^a-z0-9]/g, ''); return n && s.includes(' ' + n + ' ') && !/^(euros?|et|centimes?|a|au|aux|chez|pour|de|du|des|la|le|les|un|une|en|par|avec|depense|achat|achete|paye|payee|recu|revenu|j|ai|je|d)$/.test(n) && !/^\d+$/.test(n); });
  if (words.length) r.label = words.join(' ').replace(/^./, c => c.toUpperCase()).slice(0, 100);
  if (!r.category && r.label) { const g = guessCategory(r.label, r.type || type); if (g) { r.category = g.category; r.subcategory = g.subcategory; } }
  return r;
}
