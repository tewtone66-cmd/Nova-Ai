import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverFile = path.join(root, "server/index.js");
const devFile = path.join(root, "public/dev.js");

function insertOnce(file, marker, anchor, code) {
  let source = fs.readFileSync(file, "utf8");
  if (source.includes(marker)) return false;
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error(`owner patch anchor missing: ${anchor}`);
  source = source.slice(0, index) + code + "\n" + source.slice(index);
  fs.writeFileSync(file, source);
  return true;
}

const backend = [
  "// === Nova Owner Feature Pack ===",
  "const ownerOnline = new Map();",
  "function ownerActivity(type, detail) { try { db = load(); db.ownerActivity = Array.isArray(db.ownerActivity) ? db.ownerActivity : []; db.ownerActivity.unshift({id:crypto.randomUUID(), type, detail:String(detail || '').slice(0,500), at:Date.now()}); db.ownerActivity = db.ownerActivity.slice(0,500); save(db); } catch(e) {} }",
  "function ownerOnlineUsers() { const now=Date.now(); db=load(); return [...ownerOnline.entries()].filter(([,v]) => now-v.at < 60000).map(([userId,v]) => { const u=findUserById(db,userId); return u ? {id:u.id,username:u.username,isGuest:Boolean(u.isGuest),disabled:Boolean(u.disabled),activeChatId:v.chatId||null,lastSeen:v.at} : null; }).filter(Boolean); }",
  "app.get('/api/admin/overview', requireOwner, (req,res) => { db=load(); const users=Array.isArray(db.users)?db.users:[]; let messages=0, conversations=0, memories=0; for(const u of users){const d=getUserData(db,u.id); conversations+=(d.conversations||[]).length; memories+=(d.memories||[]).length; for(const c of d.conversations||[]) messages+=(c.messages||[]).length;} res.json({ok:true,online:ownerOnlineUsers(),users:users.length,messages,conversations,memories,errors:Array.isArray(db.ownerErrors)?db.ownerErrors.slice(0,30):[],activity:Array.isArray(db.ownerActivity)?db.ownerActivity.slice(0,30):[],announcement:db.ownerAnnouncement||null}); });",
  "app.post('/api/admin/heartbeat', requireAuth, (req,res) => { const uid=req.user.id; ownerOnline.set(uid,{at:Date.now(),chatId:String(req.body?.chatId||'').slice(0,100)}); res.json({ok:true,messages:[]}); });",
  "app.post('/api/admin/users/:id/action', requireOwner, (req,res) => { db=load(); const u=findUserById(db,req.params.id); if(!u) return jsonError(res,404,'کاربر پیدا نشد.','NOT_FOUND'); const action=String(req.body?.action||''); if(action==='disable') u.disabled=true; else if(action==='enable') u.disabled=false; else if(action==='delete'){db.users=db.users.filter(x=>x.id!==u.id); if(db.data) delete db.data[u.id]; ownerOnline.delete(u.id); save(db); ownerActivity('USER_DELETE',u.username); return res.json({ok:true});} else return jsonError(res,400,'عملیات نامعتبر است.','VALIDATION'); save(db); ownerActivity('USER_'+action.toUpperCase(),u.username); res.json({ok:true,user:{id:u.id,username:u.username,disabled:Boolean(u.disabled)}}); });",
  "app.get('/api/admin/users/:id', requireOwner, (req,res) => { db=load(); const u=findUserById(db,req.params.id); if(!u) return jsonError(res,404,'کاربر پیدا نشد.','NOT_FOUND'); const d=getUserData(db,u.id); res.json({ok:true,user:{id:u.id,username:u.username,isGuest:Boolean(u.isGuest),disabled:Boolean(u.disabled),createdAt:u.createdAt,email:u.email||''},data:{settings:d.settings,conversations:d.conversations,memories:d.memories}}); });",
  "app.post('/api/admin/users/:id/message', requireOwner, (req,res) => { db=load(); const u=findUserById(db,req.params.id); if(!u) return jsonError(res,404,'کاربر پیدا نشد.','NOT_FOUND'); const text=String(req.body?.text||'').trim().slice(0,2000); if(!text) return jsonError(res,400,'متن پیام خالی است.','VALIDATION'); const d=getUserData(db,u.id); d.ownerInbox=Array.isArray(d.ownerInbox)?d.ownerInbox:[]; d.ownerInbox.push({id:crypto.randomUUID(),text,at:Date.now(),delivered:false}); d.ownerInbox=d.ownerInbox.slice(-50); save(db); ownerActivity('SUPPORT_MESSAGE',u.username); res.json({ok:true}); });",
  "app.get('/api/admin/errors', requireOwner, (req,res) => { db=load(); res.json({ok:true,errors:Array.isArray(db.ownerErrors)?db.ownerErrors.slice(0,100):[]}); });",
  "app.delete('/api/admin/errors', requireOwner, (req,res) => { db=load(); db.ownerErrors=[]; save(db); ownerActivity('ERRORS_CLEAR','all'); res.json({ok:true}); });",
  "app.get('/api/admin/activity', requireOwner, (req,res) => { db=load(); res.json({ok:true,activity:Array.isArray(db.ownerActivity)?db.ownerActivity.slice(0,100):[]}); });",
  "app.put('/api/admin/announcement', requireOwner, (req,res) => { db=load(); const text=String(req.body?.text||'').trim().slice(0,500); db.ownerAnnouncement=text?{text,at:Date.now(),enabled:req.body?.enabled!==false}:null; save(db); ownerActivity('ANNOUNCEMENT',text||'off'); res.json({ok:true,announcement:db.ownerAnnouncement}); });",
  "app.get('/api/announcement', (req,res) => { db=load(); res.json({ok:true,announcement:db.ownerAnnouncement?.enabled?db.ownerAnnouncement:null}); });",
  "app.get('/api/admin/backup', requireOwner, (req,res) => { db=load(); res.json({ok:true,backup:{createdAt:Date.now(),users:(db.users||[]).length,keys:Object.keys(db.data||{}).length,updates:(db.updates||[]).length}}); });",
  "app.post('/api/admin/backup', requireOwner, (req,res) => { db=load(); save(db); ownerActivity('BACKUP','manual'); res.json({ok:true,createdAt:Date.now()}); });",
  "",
].join("\n");

insertOnce(serverFile, "Nova Owner Feature Pack", "app.listen(", backend);

const client = [
  "// === Nova Owner Feature UI ===",
  "(() => {",
  "  function addPanel(title, body) { const s=document.createElement('section'); s.className='panel'; s.style.marginTop='18px'; const h=document.createElement('h2'); h.textContent=title; s.appendChild(h); const b=document.createElement('div'); b.className='owner-feature-body'; b.innerHTML=body; s.appendChild(b); dash.appendChild(s); return s; }",
  "  async function refreshOwnerFeatures(){",
  "    if(dash.classList.contains('hidden')) return;",
  "    let box=document.getElementById('novaOwnerFeatures');",
  "    if(!box){ box=document.createElement('div'); box.id='novaOwnerFeatures'; dash.appendChild(box);",
  "      const live=addPanel('Live Control Center','<div id=ownerOnline class=owner-list>در حال دریافت...</div>');",
  "      const ann=addPanel('📢 اعلان سراسری','<textarea id=ownerAnnouncement rows=3 style=width:100% placeholder=پیام برای همه کاربران></textarea><br><button id=ownerAnnOn>فعال کردن اعلان</button> <button id=ownerAnnOff class=ghost>خاموش</button>');
  "      const errors=addPanel('🚨 Error Center','<button id=ownerClearErrors class=ghost>پاک کردن</button><div id=ownerErrors class=owner-list></div>');
  "      const activity=addPanel('👑 Owner Activity','<div id=ownerActivity class=owner-list></div>');
  "      const backup=addPanel('💾 Backup Center','<button id=ownerBackup>Backup Now</button><div id=ownerBackupInfo class=muted></div>');
  "      document.getElementById('ownerAnnOn').onclick=()=>setAnnouncement(true); document.getElementById('ownerAnnOff').onclick=()=>setAnnouncement(false); document.getElementById('ownerClearErrors').onclick=async()=>{await api('/api/admin/errors',{method:'DELETE'});refreshOwnerFeatures()}; document.getElementById('ownerBackup').onclick=async()=>{await api('/api/admin/backup',{method:'POST'});refreshOwnerFeatures()};
  "    }
  "    try{ const d=await api('/api/admin/overview'); const list=document.getElementById('ownerOnline'); list.innerHTML=d.online.length?d.online.map(u=>'<div style=padding:10px 0;border-bottom:1px solid var(--border)><b>'+esc(u.username)+'</b><div class=muted>'+ (u.isGuest?'مهمان':'کاربر') +' · '+new Date(u.lastSeen).toLocaleTimeString('fa-IR')+'</div><button class=ghost data-owner-msg='+esc(u.id)+'>پیام</button> <button class=ghost data-owner-info='+esc(u.id)+'>جزئیات</button> <button class=ghost data-owner-toggle='+esc(u.id)+'>مدیریت</button></div>').join(''):'<p class=muted>کاربر آنلاین فعالی نیست.</p>'; qa('[data-owner-msg]').forEach(b=>b.onclick=()=>ownerMessage(b.dataset.ownerMsg)); qa('[data-owner-info]').forEach(b=>b.onclick=()=>ownerUser(b.dataset.ownerInfo)); qa('[data-owner-toggle]').forEach(b=>b.onclick=()=>ownerToggle(b.dataset.ownerToggle)); document.getElementById('ownerErrors').innerHTML=d.errors.length?d.errors.map(x=>'<div style=padding:8px 0><b>'+esc(x.code)+'</b> '+esc(x.message)+'</div>').join(''):'<p class=muted>خطایی ثبت نشده.</p>'; document.getElementById('ownerActivity').innerHTML=d.activity.length?d.activity.map(x=>'<div style=padding:8px 0><b>'+esc(x.type)+'</b> '+esc(x.detail)+'</div>').join(''):'<p class=muted>فعالیتی ثبت نشده.</p>'; const bk=await api('/api/admin/backup'); document.getElementById('ownerBackupInfo').textContent='Users: '+bk.backup.users+' · Data: '+bk.backup.keys+' · Updates: '+bk.backup.updates; }catch(e){console.warn('Owner features:',e)}",
  "  }",
  "  async function setAnnouncement(enabled){ const text=document.getElementById('ownerAnnouncement')?.value||''; await api('/api/admin/announcement',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,enabled})}); refreshOwnerFeatures(); }",
  "  async function ownerMessage(id){const text=prompt('پیام پشتیبانی را وارد کن:');if(!text)return;await api('/api/admin/users/'+encodeURIComponent(id)+'/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});alert('پیام ارسال شد.');}",
  "  async function ownerUser(id){const d=await api('/api/admin/users/'+encodeURIComponent(id));alert(d.user.username+'\\n'+(d.user.isGuest?'مهمان':'حساب کاربری')+'\\nچت‌ها: '+d.data.conversations.length+'\\nMemory: '+d.data.memories.length);}",
  "  async function ownerToggle(id){const d=await api('/api/admin/users/'+encodeURIComponent(id));const action=d.user.disabled?'enable':'disable';if(!confirm(action==='disable'?'این کاربر غیرفعال شود؟':'این کاربر فعال شود؟'))return;await api('/api/admin/users/'+encodeURIComponent(id)+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});refreshOwnerFeatures();}",
  "  const timer=setInterval(refreshOwnerFeatures,20000); void timer; const boot=setInterval(()=>{if(!dash.classList.contains('hidden')){clearInterval(boot);refreshOwnerFeatures()}},500);",
  "})();",
].join("\n");

insertOnce(devFile, "Nova Owner Feature UI", "", client);

console.log("Nova Owner Feature Pack ready");
