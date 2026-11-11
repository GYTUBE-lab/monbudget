/* Mon Budget v2 — sauvegarde Google Drive (fichier séparé de la version actuelle) */
(function () {
'use strict';
const SYNC_KEY = 'mon-budget-v2-sync', TOKEN_KEY = 'mon-budget-gtoken', CID_KEY = 'mon-budget-google-client-id', NONCE_KEY = 'mon-budget-v2-oauth-state', AUTO_KEY = 'mon-budget-v2-auto-login';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'Mon Budget v2 - données.json';
const API = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let meta = readJSON(SYNC_KEY, {}); /* {enabled,fileId,version,dirty,lastSync,lastError} */
let rev = 0, busy = false, again = false, timer = null, status = '';
const setMeta = p => { meta = { ...meta, ...p }; writeJSON(SYNC_KEY, meta); updateChip(); };
const clientId = () => String(window.MON_BUDGET_GOOGLE_CLIENT_ID || '').trim() || localStorage.getItem(CID_KEY) || '';
const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');
const token = () => { const t = readJSON(TOKEN_KEY, null); return t && t.exp > Date.now() + 60000 ? t.value : null; };
const httpsOK = () => location.protocol === 'https:' || location.hostname === 'localhost';
const fmtTime = ms => { if (!ms) return ''; const d = new Date(ms); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };

/* ---------- Connexion Google ---------- */
function canUseGoogle() {
  if (!clientId()) { alert('La sauvegarde Google Drive n’est pas configurée (identifiant client manquant dans config.js).'); return false; }
  if (!httpsOK()) { alert('La connexion Google fonctionne seulement depuis l’adresse https de l’application.'); return false; }
  return true;
}
function login(silent) {
  if (!canUseGoogle()) return;
  const nonce = uid(); localStorage.setItem(NONCE_KEY, nonce);
  const p = new URLSearchParams({ client_id: clientId(), redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE, include_granted_scopes: 'true', state: nonce });
  if (silent) p.set('prompt', 'none');
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
}
function handleRedirect() {
  const h = location.hash || ''; if (!/[#&](access_token|error)=/.test(h)) return;
  const q = new URLSearchParams(h.slice(1)); history.replaceState(null, '', location.pathname + location.search);
  const expected = localStorage.getItem(NONCE_KEY); localStorage.removeItem(NONCE_KEY);
  if (!expected || q.get('state') !== expected) return;
  if (q.get('error')) { setMeta({ lastError: q.get('error') === 'access_denied' ? 'Connexion à Google refusée.' : 'Reconnexion à Google nécessaire.' }); return; }
  if (!(q.get('scope') || '').includes('drive.file')) { setMeta({ lastError: 'Cochez l’accès à Google Drive lors de la connexion.' }); return; }
  writeJSON(TOKEN_KEY, { value: q.get('access_token'), exp: Date.now() + Number(q.get('expires_in') || 3600) * 1000 });
  sessionStorage.removeItem(AUTO_KEY);
  setMeta({ enabled: true, lastError: '' });
}

/* ---------- Appels Google Drive ---------- */
async function api(url, opt = {}) {
  const t = token(); if (!t) { const e = Error('Reconnexion à Google nécessaire'); e.auth = true; throw e; }
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + t } });
  if (r.status === 401) { localStorage.removeItem(TOKEN_KEY); const e = Error('Reconnexion à Google nécessaire'); e.auth = true; throw e; }
  if (!r.ok) throw Error('Google Drive indisponible (erreur ' + r.status + ')');
  return r;
}
async function findFile(value) {
  const q = encodeURIComponent(`appProperties has { key='monBudget' and value='${value}' } and trashed=false`);
  const list = await (await api(API + '?q=' + q + '&spaces=drive&orderBy=modifiedTime%20desc&fields=files(id,version,modifiedTime)')).json();
  return list.files?.[0] || null;
}
async function remoteFile() {
  if (meta.fileId) { try { const f = await (await api(API + '/' + meta.fileId + '?fields=id,version,modifiedTime,trashed')).json(); if (!f.trashed) return f; } catch (e) { if (e.auth) throw e; } }
  return findFile('data-v2');
}
const downloadJSON = async id => JSON.parse(await (await api(API + '/' + id + '?alt=media')).text());
async function upload(fileId) {
  const body = JSON.stringify(state);
  if (fileId) return (await api(UP + '/' + fileId + '?uploadType=media&fields=id,version,modifiedTime', { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body })).json();
  const b = 'mb2' + uid().replace(/-/g, ''), m = { name: FILE_NAME, mimeType: 'application/json', description: 'Données de Mon Budget v2. Ne pas modifier à la main.', appProperties: { monBudget: 'data-v2' } };
  const multipart = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(m) + '\r\n--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + body + '\r\n--' + b + '--';
  return (await api(UP + '?uploadType=multipart&fields=id,version,modifiedTime', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart })).json();
}

/* ---------- Données ---------- */
const trivial = s => !s?.transactions?.length && !s?.schedules?.length;
function applyRemote(data, f) {
  state = validate(data); ui.onboard = null;
  save({ silent: true });
  setMeta({ fileId: f.id, version: String(f.version), dirty: false, lastSync: Date.now(), lastError: '' });
  render();
}
function chooseSheet(title, html, choices) {
  return new Promise(resolve => {
    const acts = {}; choices.forEach(([k]) => acts['c-' + k] = () => { closeSheet(); resolve(k); });
    openSheet(title, html, choices.map(([k, l, cls]) => `<button class="btn ${cls || 'ghost'} full" data-act="c-${k}">${l}</button>`).join(''), acts, { onClose: () => resolve('later') });
    $('#sheet .sheet-foot').style.flexDirection = 'column';
  });
}

/* ---------- Synchronisation ---------- */
async function sync() {
  if (!meta.enabled || !navigator.onLine || !token()) { updateChip(); return; }
  if (busy) { again = true; return; }
  busy = true; status = 'Synchronisation…'; updateChip();
  const startRev = rev;
  const sent = n => { setMeta({ fileId: n.id, version: String(n.version), dirty: rev !== startRev, lastSync: Date.now(), lastError: '' }); if (rev !== startRev) again = true; };
  try {
    const f = await remoteFile();
    if (!f) {
      if (trivial(state)) {
        const f1 = await findFile('data');
        if (f1) {
          const d1 = await downloadJSON(f1.id); status = ''; updateChip();
          const c = await chooseSheet('Copier vos données actuelles ?', `<p style="margin:0">Google Drive contient les données de la <b>version actuelle</b> de Mon Budget (${d1.transactions?.length || 0} opérations).</p><p class="small" style="margin:0">La v2 en fait une copie dans un fichier séparé, « ${FILE_NAME} ». Le fichier de la version actuelle n’est pas modifié.</p>`, [['copy', 'Copier mes données dans la v2', ''], ['later', 'Plus tard']]);
          if (c === 'copy') { state = convertV1(d1); ui.onboard = null; save({ silent: true }); render(); sent(await upload(null)); toast('Données copiées : ' + state.transactions.length + ' opérations'); }
        } else if (!state.accounts.length) { status = ''; ui.onboard = 'accounts'; render(); toast('Aucune donnée dans votre Drive : décrivez vos comptes pour commencer.', 4000); }
        else sent(await upload(null));
      } else sent(await upload(null));
    }
    else if (meta.fileId === f.id && meta.version === String(f.version)) { if (meta.dirty) sent(await upload(f.id)); else setMeta({ lastSync: Date.now(), lastError: '' }); }
    else {
      const remote = await downloadJSON(f.id);
      if (rev !== startRev) again = true;
      else if (trivial(state) || (!meta.dirty && meta.fileId === f.id)) { applyRemote(remote, f); if (remote.transactions?.length) toast('Données mises à jour depuis Google Drive'); }
      else if (JSON.stringify(remote) === JSON.stringify(state)) setMeta({ fileId: f.id, version: String(f.version), dirty: false, lastSync: Date.now(), lastError: '' });
      else {
        status = 'Deux versions : choix à faire'; updateChip();
        const c = await chooseSheet('Deux versions différentes', `<p style="margin:0">Les données de cet appareil et celles de Google Drive ne sont pas identiques.</p><div class="card" style="background:var(--bg)"><b>Google Drive</b> : ${remote.transactions?.length || 0} opérations · modifié le ${esc(new Date(f.modifiedTime).toLocaleString('fr-FR'))}<br><b>Cet appareil</b> : ${state.transactions.length} opérations</div><p class="tiny" style="margin:0">La version écartée reste dans l’historique automatique (Sauvegardes) et dans l’historique des versions du fichier Drive.</p>`, [['drive', 'Utiliser les données de Google Drive', ''], ['local', 'Garder cet appareil et remplacer Drive'], ['later', 'Décider plus tard']]);
        status = '';
        if (c === 'drive') { applyRemote(remote, f); toast('Données de Google Drive utilisées'); }
        else if (c === 'local') { sent(await upload(f.id)); toast('Google Drive mis à jour avec cet appareil'); }
        else setMeta({ lastError: 'Deux versions différentes : choix à faire.', dirty: true });
      }
    }
  } catch (e) { setMeta({ lastError: e.message || 'Synchronisation impossible' }); }
  finally { busy = false; status = ''; updateChip(); if (again) { again = false; setTimeout(sync, 300); } }
}
const schedule = (ms = 1500) => { clearTimeout(timer); timer = setTimeout(sync, ms); };

/* ---------- Indicateur ---------- */
function chipState() {
  if (!meta.enabled) return ['Activer Google Drive', 'off'];
  if (status) return [status, 'busy'];
  if (!navigator.onLine) return [meta.dirty ? 'Hors connexion · envoi en attente' : 'Hors connexion', 'wait'];
  if (!token()) return [meta.dirty ? 'Reconnecter · envoi en attente' : 'Reconnecter Drive', 'warn'];
  if (meta.lastError) return [meta.lastError, 'warn'];
  if (meta.dirty) return ['Envoi en attente', 'wait'];
  return ['Drive à jour' + (meta.lastSync ? ' · ' + fmtTime(meta.lastSync) : ''), 'ok'];
}
function updateChip() {
  const c = document.getElementById('syncChip'); if (!c) return;
  const [text, kind] = chipState(); c.dataset.kind = kind;
  c.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z"/>' + (kind === 'ok' ? '<path d="m9 14 2 2 4-4"/>' : '') + '</svg> ' + esc(text);
  const p = document.getElementById('drivePanel'); if (p && !p.contains(document.activeElement)) p.innerHTML = drivePanelHTML();
}
function drivePanelHTML() {
  const [text] = chipState(), on = meta.enabled && token();
  return `<div class="head"><h2>Google Drive</h2><span class="tiny b">${esc(text)}</span></div><p class="small" style="margin:8px 0 12px">Chaque modification est copiée dans « ${esc(FILE_NAME)} », séparé de la version actuelle. Si le cache est vidé ou sur un nouvel appareil, reconnectez-vous : tout revient.</p>${meta.lastSync ? `<p class="tiny" style="margin:0 0 12px">Dernière synchronisation : ${esc(new Date(meta.lastSync).toLocaleString('fr-FR'))}</p>` : ''}<div class="grid2">${on ? `<button class="btn" data-drive="sync">Synchroniser</button><button class="btn ghost" data-drive="logout">Déconnecter</button>` : `<button class="btn" data-drive="login" ${clientId() ? '' : 'disabled'}>Se connecter</button>${meta.enabled ? '<button class="btn ghost" data-drive="logout">Désactiver</button>' : ''}`}</div>${clientId() ? '' : '<p class="tiny neg" style="margin:10px 0 0">Identifiant client Google manquant dans config.js.</p>'}`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-drive]'); if (!b) return;
  const a = b.dataset.drive;
  if (a === 'login') { setMeta({ enabled: true }); login(false); }
  if (a === 'sync') { if (/choix/.test(meta.lastError || '')) meta.version = ''; await sync(); }
  if (a === 'logout' && confirm('Arrêter la sauvegarde Google Drive sur cet appareil ? Vos données restent sur l’appareil et dans Drive.')) { setMeta({ enabled: false, lastError: '' }); render(); }
});

/* ---------- Points d'entrée pour l'interface ---------- */
window.updateChip = updateChip;
window.drivePanelHTML = drivePanelHTML;
window.driveOnSaved = () => { rev++; if (meta.enabled) { setMeta({ dirty: true }); schedule(); } };
window.driveChipClick = () => { if (!meta.enabled || !token()) { if (!canUseGoogle()) return; setMeta({ enabled: true }); login(false); return; } if (/choix/.test(meta.lastError || '')) meta.version = ''; sync(); };
window.driveStart = () => { if (!canUseGoogle()) return; setMeta({ enabled: true }); if (token()) sync(); else login(false); };

handleRedirect();
window.addEventListener('online', () => { updateChip(); schedule(500); });
window.addEventListener('offline', updateChip);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && meta.enabled) { if (token()) schedule(300); else updateChip(); } });
setInterval(updateChip, 60000);
updateChip();
if (meta.enabled) {
  if (token()) sync();
  else if (navigator.onLine && clientId() && httpsOK() && !sessionStorage.getItem(AUTO_KEY)) { sessionStorage.setItem(AUTO_KEY, '1'); login(true); }
}
})();
