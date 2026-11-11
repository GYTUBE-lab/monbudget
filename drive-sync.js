/* Mon Budget — sauvegarde et synchronisation Google Drive
   Les données restent aussi sur l'appareil (fonctionnement hors connexion).
   À chaque enregistrement, une copie est envoyée dans le fichier
   « Mon Budget - données.json » de votre Google Drive.
   Si le cache du navigateur est vidé, les données sont récupérées depuis Drive. */
(function(){
'use strict';
const SYNC_KEY='mon-budget-sync',TOKEN_KEY='mon-budget-gtoken',CID_KEY='mon-budget-google-client-id',NONCE_KEY='mon-budget-oauth-state',AUTO_KEY='mon-budget-auto-login';
const SCOPE='https://www.googleapis.com/auth/drive.file';
const FILE_NAME='Mon Budget - données.json';
const API='https://www.googleapis.com/drive/v3/files',UP='https://www.googleapis.com/upload/drive/v3/files';
const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}};
const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
let meta=readJSON(SYNC_KEY,{});   // {enabled,fileId,version,dirty,lastSync,lastError}
let rev=0,busy=false,again=false,timer=null,status='';

function setMeta(p){meta={...meta,...p};writeJSON(SYNC_KEY,meta);updateChip()}
function clientId(){return String(window.MON_BUDGET_GOOGLE_CLIENT_ID||'').trim()||localStorage.getItem(CID_KEY)||''}
function redirectUri(){return location.origin+location.pathname.replace(/index\.html$/,'')}
function token(){const t=readJSON(TOKEN_KEY,null);return t&&t.exp>Date.now()+60000?t.value:null}
function isEmpty(s){return !s?.transactions?.length&&!s?.recurring?.length&&!Object.keys(s?.accounts||{}).length}
function fmtTime(ms){if(!ms)return '';const d=new Date(ms),sameDay=d.toDateString()===new Date().toDateString();return sameDay?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}

/* ---------- Connexion Google (sans serveur, par redirection) ---------- */
function canUseGoogle(){
  if(!clientId()){alert('La sauvegarde Google Drive n’est pas encore configurée. Collez l’identifiant client Google dans Sauvegardes (voir LISEZ-MOI).');tab='backup';render();return false}
  if(location.protocol!=='https:'&&location.hostname!=='localhost'){alert('La connexion Google fonctionne seulement depuis l’adresse https de l’application (par ex. Netlify), pas depuis un fichier ouvert sur l’ordinateur.');return false}
  return true}
function login(silent){
  if(!canUseGoogle())return;
  const nonce=crypto.randomUUID();localStorage.setItem(NONCE_KEY,nonce);
  const p=new URLSearchParams({client_id:clientId(),redirect_uri:redirectUri(),response_type:'token',scope:SCOPE,include_granted_scopes:'true',state:nonce});
  if(silent)p.set('prompt','none');
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?'+p.toString())}
function handleRedirect(){
  const h=location.hash||'';if(!/[#&](access_token|error)=/.test(h))return;
  const q=new URLSearchParams(h.slice(1));history.replaceState(null,'',location.pathname+location.search);
  const expected=localStorage.getItem(NONCE_KEY);localStorage.removeItem(NONCE_KEY);
  if(!expected||q.get('state')!==expected)return;
  if(q.get('error')){setMeta({lastError:q.get('error')==='access_denied'?'Connexion à Google refusée.':'Reconnexion à Google nécessaire.'});return}
  if(!(q.get('scope')||'').includes('drive.file')){setMeta({lastError:'Autorisez l’accès à Google Drive lors de la connexion (case à cocher).'});return}
  writeJSON(TOKEN_KEY,{value:q.get('access_token'),exp:Date.now()+Number(q.get('expires_in')||3600)*1000});
  sessionStorage.removeItem(AUTO_KEY);
  setMeta({enabled:true,lastError:''})}

/* ---------- Appels Google Drive ---------- */
async function api(url,opt={}){
  const t=token();if(!t){const e=Error('Reconnexion à Google nécessaire');e.auth=true;throw e}
  const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),Authorization:'Bearer '+t}});
  if(r.status===401){localStorage.removeItem(TOKEN_KEY);const e=Error('Reconnexion à Google nécessaire');e.auth=true;throw e}
  if(!r.ok){const e=Error('Google Drive indisponible (erreur '+r.status+')');e.status=r.status;throw e}
  return r}
async function remoteFile(){
  if(meta.fileId){try{const f=await (await api(API+'/'+meta.fileId+'?fields=id,version,modifiedTime,trashed')).json();if(!f.trashed)return f}catch(e){if(e.auth)throw e}}
  const q=encodeURIComponent("appProperties has { key='monBudget' and value='data' } and trashed=false");
  const list=await (await api(API+'?q='+q+'&spaces=drive&orderBy=modifiedTime%20desc&fields=files(id,version,modifiedTime)')).json();
  return list.files?.[0]||null}
async function download(id){return JSON.parse(await (await api(API+'/'+id+'?alt=media')).text())}
async function upload(fileId){
  const body=JSON.stringify(state);
  if(fileId)return (await api(UP+'/'+fileId+'?uploadType=media&fields=id,version,modifiedTime',{method:'PATCH',headers:{'Content-Type':'application/json; charset=UTF-8'},body})).json();
  const b='monbudget'+crypto.randomUUID().replace(/-/g,''),m={name:FILE_NAME,mimeType:'application/json',description:'Données de l’application Mon Budget. Ne pas modifier à la main.',appProperties:{monBudget:'data'}};
  const multipart='--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(m)+'\r\n--'+b+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+body+'\r\n--'+b+'--';
  return (await api(UP+'?uploadType=multipart&fields=id,version,modifiedTime',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+b},body:multipart})).json()}

/* ---------- Données locales ---------- */
function keepInHistory(raw){try{if(!raw)return;const hist=JSON.parse(localStorage.getItem(key+'-history')||'[]');hist.unshift({at:new Date().toISOString(),data:raw});localStorage.setItem(key+'-history',JSON.stringify(hist.slice(0,5)))}catch{}}
function applyRemote(data,f){
  validate(data);
  keepInHistory(localStorage.getItem(key));
  state=data;
  try{localStorage.setItem(key,JSON.stringify(state))}catch{}
  setMeta({fileId:f.id,version:String(f.version),dirty:false,lastSync:Date.now(),lastError:''});
  render()}
function countOps(s){return (s?.transactions||[]).length}

/* ---------- Choix en cas de deux versions différentes ---------- */
function askConflict(remote,f){return new Promise(resolve=>{
  let d=document.getElementById('syncConflict');if(!d){d=document.createElement('dialog');d.id='syncConflict';document.body.appendChild(d)}
  d.innerHTML='<h2>Deux versions différentes</h2><p>Les données de cet appareil et celles de Google Drive ne sont pas identiques.</p>'+
   '<div class="note"><strong>Google Drive</strong> : '+countOps(remote)+' opération(s) · modifié le '+esc(new Date(f.modifiedTime).toLocaleString('fr-FR'))+'<br><strong>Cet appareil</strong> : '+countOps(state)+' opération(s)</div>'+
   '<p class="muted">La version écartée est conservée dans l’historique automatique (Sauvegardes) et dans l’historique des versions de Google Drive.</p>'+
   '<div style="display:grid;gap:10px;margin-top:18px"><button class="primary" data-choice="drive">Utiliser les données de Google Drive</button><button data-choice="local">Garder cet appareil et remplacer Google Drive</button><button data-choice="later">Décider plus tard</button></div>';
  d.onclick=e=>{const c=e.target.closest('[data-choice]')?.dataset.choice;if(!c)return;d.close();resolve(c)};
  d.oncancel=e=>{e.preventDefault()};
  d.showModal()})}

/* ---------- Synchronisation ---------- */
async function sync(){
  if(!meta.enabled){updateChip();return}
  if(!navigator.onLine){status='';updateChip();return}
  if(!token()){updateChip();return}
  if(busy){again=true;return}
  busy=true;status='Synchronisation…';updateChip();
  const startRev=rev;
  const sent=n=>{setMeta({fileId:n.id,version:String(n.version),dirty:rev!==startRev,lastSync:Date.now(),lastError:''});if(rev!==startRev)again=true};
  try{
    const f=await remoteFile();
    if(!f){sent(await upload(null))}
    else if(meta.fileId===f.id&&meta.version===String(f.version)){
      if(meta.dirty)sent(await upload(f.id));else setMeta({lastSync:Date.now(),lastError:''})}
    else{
      const remote=await download(f.id);
      if(rev!==startRev){again=true}
      else if(isEmpty(state)||(!meta.dirty&&meta.fileId===f.id)){applyRemote(remote,f);if(countOps(remote))toast('Données mises à jour depuis Google Drive')}
      else if(JSON.stringify(remote)===JSON.stringify(state)){setMeta({fileId:f.id,version:String(f.version),dirty:false,lastSync:Date.now(),lastError:''})}
      else{
        status='Deux versions : choix à faire';updateChip();
        const choice=await askConflict(remote,f);status='';
        if(choice==='drive'){applyRemote(remote,f);toast('Données de Google Drive utilisées')}
        else if(choice==='local'){keepInHistory(JSON.stringify(remote));sent(await upload(f.id));toast('Google Drive mis à jour avec cet appareil')}
        else setMeta({lastError:'Deux versions différentes : choix à faire.',dirty:true})}}
  }catch(e){setMeta({lastError:e.message||'Synchronisation impossible'})}
  finally{busy=false;status='';updateChip();if(again){again=false;setTimeout(sync,300)}}}
function schedule(ms=1500){clearTimeout(timer);timer=setTimeout(sync,ms)}

/* Chaque enregistrement local déclenche l'envoi vers Drive */
const baseSave=save;
save=function(){baseSave.apply(this,arguments);rev++;if(meta.enabled){setMeta({dirty:true});schedule()}};

/* ---------- Indicateur dans l'en-tête ---------- */
function chipState(){
  if(!meta.enabled)return ['☁ Activer la sauvegarde Drive','off'];
  if(status)return ['☁ '+status,'busy'];
  if(!navigator.onLine)return [meta.dirty?'☁ Hors connexion · envoi en attente':'☁ Hors connexion','wait'];
  if(!token())return [meta.dirty?'☁ Reconnecter Drive · envoi en attente':'☁ Reconnecter Google Drive','warn'];
  if(meta.lastError)return ['☁ '+meta.lastError,'warn'];
  if(meta.dirty)return ['☁ Envoi en attente','wait'];
  return ['☁ Drive à jour'+(meta.lastSync?' · '+fmtTime(meta.lastSync):''),'ok']}
function updateChip(){const c=document.getElementById('syncChip');if(!c)return;const [text,kind]=chipState();c.textContent=text;c.dataset.kind=kind;c.title='Sauvegarde Google Drive'}
function chipClick(){
  if(!meta.enabled||!token()){if(!clientId()){tab='backup';render();setTimeout(()=>document.getElementById('drivePanel')?.scrollIntoView({behavior:'smooth'}),50);return}login(false);return}
  if(meta.lastError&&/choix/.test(meta.lastError))meta.version='';
  sync()}

/* ---------- Panneau dans Sauvegardes ---------- */
function drivePanel(){
  const configured=!!clientId(),[text]=chipState();
  return '<section class="panel section" id="drivePanel"><h2>Sauvegarde automatique Google Drive</h2>'+
  '<p>Vos données sont enregistrées sur cet appareil <strong>et</strong> copiées automatiquement dans le fichier « '+esc(FILE_NAME)+' » de votre Google Drive à chaque modification. Si le cache est vidé, ou sur un nouvel appareil, connectez-vous : vos données reviennent.</p>'+
  '<div class="note"><strong>État :</strong> '+esc(text.replace(/^☁ /,''))+(meta.lastSync?'<br>Dernière synchronisation : '+esc(new Date(meta.lastSync).toLocaleString('fr-FR')):'')+'</div>'+
  '<div class="controls" style="margin-top:16px">'+
   (meta.enabled&&token()?'<button class="primary" data-drive="sync">Synchroniser maintenant</button><button data-drive="logout">Déconnecter Google Drive</button>':'<button class="primary" data-drive="login"'+(configured?'':' disabled')+'>Se connecter à Google Drive</button>'+(meta.enabled?'<button data-drive="logout">Désactiver</button>':''))+
  '</div>'+
  '<p class="muted">Sans connexion internet, l’application continue de fonctionner ; l’envoi se fait au retour du réseau. La connexion Google dure environ une heure : l’application se reconnecte seule à l’ouverture, ou d’un appui sur l’indicateur ☁ en haut.</p>'+
  '<details'+(configured?'':' open')+'><summary>Configuration (une seule fois)</summary><p class="muted">Identifiant client OAuth créé dans Google Cloud (voir LISEZ-MOI.txt). '+(window.MON_BUDGET_GOOGLE_CLIENT_ID?'Il est déjà fourni par le fichier config.js.':'Vous pouvez aussi le mettre dans config.js pour tous vos appareils.')+'</p>'+
  '<label>Identifiant client Google<input id="driveClientId" value="'+esc(clientId())+'" placeholder="123456789-xxxx.apps.googleusercontent.com" autocomplete="off"></label><button data-drive="saveCid">Enregistrer l’identifiant</button>'+
  '<p class="muted">Adresse de retour à déclarer dans Google Cloud : <strong>'+esc(redirectUri())+'</strong></p></details></section>'}
const baseRender=render;
render=function(){baseRender.apply(this,arguments);if(tab==='backup'){const box=document.createElement('div');box.innerHTML=drivePanel();document.getElementById('view').prepend(box.firstChild)}updateChip()};
document.getElementById('view').addEventListener('click',async e=>{
  const b=e.target.closest('[data-drive]');if(!b)return;const a=b.dataset.drive;
  if(a==='login')login(false);
  if(a==='sync'){if(meta.lastError&&/choix/.test(meta.lastError))meta.version='';await sync();render()}
  if(a==='saveCid'){const v=document.getElementById('driveClientId').value.trim();if(v&&!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(v)){alert('Identifiant invalide : il se termine par .apps.googleusercontent.com');return}if(v)localStorage.setItem(CID_KEY,v);else localStorage.removeItem(CID_KEY);toast('Identifiant enregistré');render()}
  if(a==='logout'&&confirm('Arrêter la sauvegarde Google Drive sur cet appareil ? Vos données restent sur l’appareil et dans Drive.')){const t=token();if(t)fetch('https://oauth2.googleapis.com/revoke?token='+encodeURIComponent(t),{method:'POST'}).catch(()=>{});localStorage.removeItem(TOKEN_KEY);setMeta({enabled:false,lastError:''});render()}
});

/* ---------- Démarrage ---------- */
const chip=document.createElement('button');chip.id='syncChip';chip.type='button';chip.onclick=chipClick;
document.querySelector('header .controls').prepend(chip);
const st=document.createElement('style');st.textContent='#syncChip{font-size:14px;padding:9px 13px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}#syncChip[data-kind=ok]{background:#e3f5ee;border-color:#9fd6c2;color:#0f6b52}#syncChip[data-kind=warn]{background:#fff0c2;border-color:#d2a231;color:#593c06}#syncChip[data-kind=wait],#syncChip[data-kind=busy]{background:#edf3ff;border-color:#9bb8ea;color:#244c8f}#syncChip[data-kind=off]{background:#fff;color:#244c8f;border-style:dashed}#syncConflict h2{margin-top:0}';
document.head.appendChild(st);
handleRedirect();
window.addEventListener('online',()=>{updateChip();schedule(500)});
window.addEventListener('offline',updateChip);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&meta.enabled){if(token())schedule(300);else updateChip()}});
setInterval(updateChip,60000);
render();
if(meta.enabled){
  if(token())sync();
  else if(navigator.onLine&&clientId()&&!sessionStorage.getItem(AUTO_KEY)&&(location.protocol==='https:'||location.hostname==='localhost')){sessionStorage.setItem(AUTO_KEY,'1');login(true)}}
window.MonBudgetDrive={sync,meta:()=>meta,_test:{setToken:v=>writeJSON(TOKEN_KEY,{value:v,exp:Date.now()+3600000})}};
})();
