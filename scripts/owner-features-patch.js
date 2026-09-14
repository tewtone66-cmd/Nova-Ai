import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const server=path.join(root,"server/index.js");
const dev=path.join(root,"public/dev.js");
const app=path.join(root,"public/app.js");

function patch(file,needle,replacement,label){
  let s=fs.readFileSync(file,"utf8");
  if(s.includes(label)) return false;
  if(!s.includes(needle)) throw new Error(`owner patch anchor missing: ${label}`);
  s=s.replace(needle,replacement);
  fs.writeFileSync(file,s);
  return true;
}

const backend=`
// === Nova Owner Feature Pack ===
const ownerOnline=new Map();
function ownerLog(type,detail){try{db=load();if(!Array.isArray(db.ownerActivity))db.ownerActivity=[];db.ownerActivity.unshift({id:id(),type,detail:String(detail||\"\").slice(0,500),at:Date.now()});db.ownerActivity=db.ownerActivity.slice(0,500);save(db);}catch(e){console.warn(\"Owner log:\",e.message)}}
function ownerError(code,message,meta={}){try{db=load();if(!Array.isArray(db.ownerErrors))db.ownerErrors=[];db.ownerErrors.unshift({id:id(),code,message:String(message||\"\").slice(0,500),meta,at:Date.now()});db.ownerErrors=db.ownerErrors.slice(0,300);save(db);}catch(e){}}
function ownerOnlineUsers(){const now=Date.now();db=load();return [...ownerOnline.entries()].filter(([,v])=>now-v.at<60000).map(([userId,v])=>{const u=findUserById(db,userId);return u?{id:u.id,username:u.username,isGuest:Boolean(u.isGuest),activeChatId:v.chatId||null,lastSeen:v.at}:null}).filter(Boolean)}
app.use(\"/api/admin\",(req,res,next)=>{if(req.path!==\"/login\"&&req.path!==\"/logout\"&&res.statusCode>=400)ownerError(\"HTTP_\"+res.statusCode,req.method+\" \"+req.path);next()});
app.get(\"/api/admin/overview\",requireOwner,(req,res)=>{db=load();const users=Array.isArray(db.users)?db.users:[];let messages=0,conversations=0,memories=0;for(const u of users){const d=getUserData(db,u.id);conversations+=(d.conversations||[]).length;memories+=(d.memories||[]).length;for(const c of d.conversations||[])messages+=(c.messages||[]).length}res.json({ok:true,online:ownerOnlineUsers(),messages,conversations,memories,errors:(db.ownerErrors||[]).slice(0,30),activity:(db.ownerActivity||[]).slice(0,30),announcement:db.ownerAnnouncement||null})});
app.post(\"/api/admin/heartbeat\",requireAuth,(req,res)=>{ownerOnline.set(req.user.id,{at:Date.now(),chatId:String(req.body?.chatId||\"\").slice(0,100)});const d=getUserData(db,req.user.id);const inbox=Array.isArray(d.ownerInbox)?d.ownerInbox:[];const pending=inbox.filter(x=>!x.delivered);inbox.forEach(x=>{x.delivered=true});d.ownerInbox=inbox.slice(-50);if(pending.length)save(db);res.json({ok:true,messages:pending.map(x=>({id:x.id,text:x.text,at:x.at}))})});
app.post(\"/api/admin/users/:id/action\",requireOwner,(req,res)=>{db=load();const u=findUserById(db,req.params.id);if(!u)return jsonError(res,404,\"کاربر پیدا نشد.\",\"NOT_FOUND\");const action=String(req.body?.action||\"\");if(action===\"disable\")u.disabled=true;else if(action===\"enable\")u.disabled=false;else if(action===\"delete\"){db.users=db.users.filter(x=>x.id!==u.id);delete db.data?.[u.id];ownerOnline.delete(u.id);save(db);ownerLog(\"USER_DELETE\",u.username);return res.json({ok:true})}else return jsonError(res,400,\"عملیات نامعتبر است.\",\"VALIDATION\");save(db);ownerLog(\"USER_\"+action.toUpperCase(),u.username);res.json({ok:true,user:{id:u.id,username:u.username,disabled:Boolean(u.disabled)}})});
app.get(\"/api/admin/users/:id\",requireOwner,(req,res)=>{db=load();const u=findUserById(db,req.params.id);if(!u)return jsonError(res,404,\"کاربر پیدا نشد.\",\"NOT_FOUND\");const d=getUserData(db,u.id);res.json({ok:true,user:{id:u.id,username:u.username,isGuest:Boolean(u.isGuest),disabled:Boolean(u.disabled),createdAt:u.createdAt,email:u.email||\"\"},data:{settings:d.settings,conversations:d.conversations,memories:d.memories}})});
app.post(\"/api/admin/users/:id/message\",requireOwner,(req,res)=>{db=load();const u=findUserById(db,req.params.id);if(!u)return jsonError(res,404,\"کاربر پیدا نشد.\",\"NOT_FOUND\");const text=String(req.body?.text||\"\").trim().slice(0,2000);if(!text)return jsonError(res,400,\"متن پیام خالی است.\",\"VALIDATION\");const d=getUserData(db,u.id);if(!Array.isArray(d.ownerInbox))d.ownerInbox=[];d.ownerInbox.push({id:id(),text,at:Date.now(),delivered:false});d.ownerInbox=d.ownerInbox.slice(-50);save(db);ownerLog(\"SUPPORT_MESSAGE\",u.username);res.json({ok:true})});
app.get(\"/api/admin/announcement\",requireOwner,(req,res)=>{db=load();res.json({ok:true,announcement:db.ownerAnnouncement||null})});
app.put(\"/api/admin/announcement\",requireOwner,(req,res)=>{db=load();const text=String(req.body?.text||\"\").trim().slice(0,500);db.ownerAnnouncement=text?{text,at:Date.now(),enabled:req.body?.enabled!==false}:null;save(db);ownerLog(\"ANNOUNCEMENT\",text||\"off\");res.json({ok:true,announcement:db.ownerAnnouncement})});
app.get(\"/api/announcement\",(req,res)=>{db=load();res.json({ok:true,announcement:db.ownerAnnouncement?.enabled?db.ownerAnnouncement:null})});
app.get(\"/api/admin/errors\",requireOwner,(req,res)=>{db=load();res.json({ok:true,errors:(db.ownerErrors||[]).slice(0,100)})});
app.delete(\"/api/admin/errors\",requireOwner,(req,res)=>{db=load();db.ownerErrors=[];save(db);ownerLog(\"ERRORS_CLEAR\",\"all\");res.json({ok:true})});
app.get(\"/api/admin/activity\",requireOwner,(req,res)=>{db=load();res.json({ok:true,activity:(db.ownerActivity||[]).slice(0,100)})});
app.get(\"/api/admin/backup\",requireOwner,(req,res)=>{db=load();res.json({ok:true,backup:{createdAt:Date.now(),users:(db.users||[]).length,keys:Object.keys(db.data||{}).length,updates:(db.updates||[]).length}})});
app.post(\"/api/admin/backup\",requireOwner,(req,res)=>{db=load();save(db);ownerLog(\"BACKUP\",\"manual\");res.json({ok:true,createdAt:Date.now()})});
`;

patch(server,
`app.post("/api/admin/logout",(req,res)=>{if(req.session)req.session.owner=false;res.json({ok:true});});`,
`app.post("/api/admin/logout",(req,res)=>{if(req.session)req.session.owner=false;res.json({ok:true});});\n${backend}`,
"Nova Owner Feature Pack");

const devExtra=`
function ownerFeaturePanels(){
 if($('#ownerFeatures'))return;
 const wrap=document.createElement('div');wrap.id='ownerFeatures';wrap.innerHTML=`+"`"+`<section class="panel owner-feature"><div class="section-head"><div><h2>Live Control Center</h2><p class="muted">کاربران آنلاین، پشتیبانی و کنترل حساب‌ها</p></div><button id="ownerRefresh" class="ghost">بروزرسانی</button></div><div id="ownerOnline" class="owner-list"></div></section><section class="panel owner-feature"><h2>📢 اعلان سراسری</h2><textarea id="ownerAnnouncementText" rows="3" placeholder="پیامی که برای همه کاربران نمایش داده شود"></textarea><div class="owner-actions"><button id="saveAnnouncement">فعال کردن اعلان</button><button id="clearAnnouncement" class="ghost">خاموش</button></div><p id="announcementState" class="muted"></p></section><section class="panel owner-feature"><div class="section-head"><div><h2>🚨 Error Center</h2><p class="muted">آخرین خطاهای ثبت‌شده</p></div><button id="clearErrors" class="ghost">پاک کردن</button></div><div id="ownerErrors" class="owner-list"></div></section><section class="panel owner-feature"><h2>👑 Owner Activity</h2><div id="ownerActivity" class="owner-list"></div></section><section class="panel owner-feature"><div class="section-head"><div><h2>💾 Backup Center</h2><p class="muted">اطلاعات وضعیت Backup</p></div><button id="backupNow">Backup Now</button></div><div id="backupInfo" class="muted"></div></section>`+"`"+`;
 dash.appendChild(wrap);
 $('#ownerRefresh').onclick=loadOwnerFeatures;$('#backupNow').onclick=async()=>{await api('/api/admin/backup',{method:'POST'});loadOwnerFeatures()};
 $('#saveAnnouncement').onclick=()=>setAnnouncement(true);$('#clearAnnouncement').onclick=()=>setAnnouncement(false);$('#clearErrors').onclick=async()=>{await api('/api/admin/errors',{method:'DELETE'});loadOwnerFeatures()};
}
async function setAnnouncement(enabled){const text=$('#ownerAnnouncementText').value;await api('/api/admin/announcement',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,enabled})});loadOwnerFeatures()}
async function loadOwnerFeatures(){ownerFeaturePanels();try{const d=await api('/api/admin/overview');$('#ownerOnline').innerHTML=d.online.length?d.online.map(u=>`+"`"+`<div class="owner-user"><div><b>${esc(u.username)}</b><span>${u.isGuest?'مهمان':'کاربر'} · ${new Date(u.lastSeen).toLocaleTimeString('fa-IR')}</span></div><div class="owner-actions"><button class="ghost" data-support="${esc(u.id)}">پیام</button><button class="ghost" data-user="${esc(u.id)}">جزئیات</button><button class="ghost" data-toggle="${esc(u.id)}">مدیریت</button></div></div>`+"`"+`).join(''):'<p class="muted">کاربر آنلاین فعالی نیست.</p>';qa('[data-support]','#ownerFeatures').forEach(b=>b.onclick=()=>ownerMessage(b.dataset.support));qa('[data-user]','#ownerFeatures').forEach(b=>b.onclick=()=>ownerUser(b.dataset.user));qa('[data-toggle]','#ownerFeatures').forEach(b=>b.onclick=()=>ownerToggle(b.dataset.toggle));$('#ownerErrors').innerHTML=d.errors.length?d.errors.map(x=>`+"`"+`<div class="owner-row"><b>${esc(x.code)}</b><span>${esc(x.message)}</span><small>${new Date(x.at).toLocaleString('fa-IR')}</small></div>`+"`"+`).join(''):'<p class="muted">خطایی ثبت نشده.</p>';$('#ownerActivity').innerHTML=d.activity.length?d.activity.map(x=>`+"`"+`<div class="owner-row"><b>${esc(x.type)}</b><span>${esc(x.detail)}</span><small>${new Date(x.at).toLocaleString('fa-IR')}</small></div>`+"`"+`).join(''):'<p class="muted">فعالیتی ثبت نشده.</p>';$('#announcementState').textContent=d.announcement?.enabled?'اعلان فعال است.':'اعلان خاموش است.';const bk=await api('/api/admin/backup');$('#backupInfo').textContent=`+"`"+`Users: ${bk.backup.users} · Data: ${bk.backup.keys} · Updates: ${bk.backup.updates}`+"`"+` }catch(e){console.warn(e)}}
async function ownerMessage(id){const text=prompt('پیام پشتیبانی را وارد کن:');if(!text)return;await api(`/api/admin/users/${id}/message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});alert('پیام ارسال شد.')} 
async function ownerUser(id){const d=await api(`/api/admin/users/${id}`);alert(`+"`"+`${d.user.username}\n${d.user.isGuest?'مهمان':'حساب کاربری'}\nچت‌ها: ${d.data.conversations.length}\nMemory: ${d.data.memories.length}`+"`"+`)}
async function ownerToggle(id){const d=await api(`/api/admin/users/${id}`);const action=d.user.disabled?'enable':'disable';if(!confirm(action==='disable'?'این کاربر غیرفعال شود؟':'این کاربر فعال شود؟'))return;await api(`/api/admin/users/${id}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});loadOwnerFeatures()}
`;
patch(dev,`let editingId=null;`,devExtra+`\nlet editingId=null;`,"ownerFeaturePanels");
patch(dev,`async function render(d){`, `async function render(d){ownerFeaturePanels();`,"ownerFeaturePanelsRender");
patch(dev,`await render(d)`, `await render(d);await loadOwnerFeatures()`,"ownerFeatureLoad");

const appPatch=`
// Nova Owner support heartbeat: keeps the Owner panel aware of active users and receives transparent human-support messages.
(()=>{let timer;async function beat(){try{const r=await fetch('/api/admin/heartbeat',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:window.state?.current||''})});const d=await r.json().catch(()=>({}));if(d.messages?.length){for(const m of d.messages){if(typeof window.addAssistantMessage==='function')window.addAssistantMessage('Nova Support',m.text);else window.dispatchEvent(new CustomEvent('nova-owner-message',{detail:m}))}}}catch{}}function start(){clearInterval(timer);beat();timer=setInterval(beat,20000)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()})();
`;
if(fs.existsSync(app)){
 let s=fs.readFileSync(app,'utf8');
 if(!s.includes('Nova Owner support heartbeat'))fs.writeFileSync(app,s+'\n'+appPatch);
}

console.log('Nova Owner Feature Pack ready');
