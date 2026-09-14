import fs from "node:fs";
import path from "node:path";

const serverFile=path.resolve("server/index.js");
let s=fs.readFileSync(serverFile,"utf8");

// When a guest registers, turn the existing guest record into the new account
// instead of starting from an empty account. This keeps the guest experience
// connected to the newly created account.
const registerOld='app.post("/api/auth/register",(req,res)=>{db=load();const {username,password,email,phone}=req.body||{};const uCheck=validateUsername(username);if(!uCheck.ok)return jsonError(res,400,uCheck.message,"INVALID_USERNAME");const pCheck=validatePassword(password);if(!pCheck.ok)return jsonError(res,400,pCheck.message,"WEAK_PASSWORD");const cCheck=validateContact({email,phone});if(!cCheck.ok)return jsonError(res,400,cCheck.message,"INVALID_CONTACT");if(findUserByUsername(db,uCheck.value))return jsonError(res,409,"این نام کاربری قبلاً استفاده شده است.","USERNAME_TAKEN");const {salt,hash}=hashPassword(password);const user={id:id(),username:uCheck.value,passwordSalt:salt,passwordHash:hash,email:email?String(email).trim():"",phone:phone?String(phone).trim():"",createdAt:Date.now()};db.users.push(user);getUserData(db,user.id);save(db);req.session.userId=user.id;res.json({ok:true,user:publicUser(user)});});';
const registerNew='app.post("/api/auth/register",(req,res)=>{db=load();const {username,password,email,phone}=req.body||{};const uCheck=validateUsername(username);if(!uCheck.ok)return jsonError(res,400,uCheck.message,"INVALID_USERNAME");const pCheck=validatePassword(password);if(!pCheck.ok)return jsonError(res,400,pCheck.message,"WEAK_PASSWORD");const cCheck=validateContact({email,phone});if(!cCheck.ok)return jsonError(res,400,cCheck.message,"INVALID_CONTACT");if(findUserByUsername(db,uCheck.value))return jsonError(res,409,"این نام کاربری قبلاً استفاده شده است.","USERNAME_TAKEN");const guestId=req.session?.userId;const guestUser=guestId?findUserById(db,guestId):null;const guestData=guestUser?.isGuest?getUserData(db,guestUser.id):null;const {salt,hash}=hashPassword(password);const user={id:id(),username:uCheck.value,passwordSalt:salt,passwordHash:hash,email:email?String(email).trim():"",phone:phone?String(phone).trim():"",createdAt:Date.now()};db.users.push(user);const newData=getUserData(db,user.id);if(guestData){newData.settings={...guestData.settings};if(newData.settings.userName==="مهمان")newData.settings.userName=uCheck.value;newData.conversations=guestData.conversations;newData.memories=guestData.memories;newData.usage=guestData.usage;delete db.data[guestUser.id];db.users=db.users.filter(x=>x.id!==guestUser.id);}save(db);req.session.userId=user.id;res.json({ok:true,user:publicUser(user),upgradedGuest:Boolean(guestData)});});';
if(s.includes(registerOld)) s=s.replace(registerOld,registerNew);

// Make guest sessions visibly identifiable to the client while retaining the
// existing server data model used by the app.
const guestRouteOld='app.post("/api/auth/guest",(req,res)=>{db=load();let username;do{username="guest"+Math.floor(100000+Math.random()*900000);}while(findUserByUsername(db,username));const {salt,hash}=hashPassword(crypto.randomBytes(24).toString("hex"));const user={id:id(),username,passwordSalt:salt,passwordHash:hash,email:"",phone:"",isGuest:true,createdAt:Date.now()};db.users.push(user);const u=getUserData(db,user.id);u.settings.userName="مهمان";save(db);req.session.userId=user.id;res.json({ok:true,user:publicUser(user)});});';
if(!s.includes(guestRouteOld)) console.warn("Nova guest patch: guest route anchor not found; register upgrade may still work.");

fs.writeFileSync(serverFile,s);

const appFile=path.resolve("public/app.js");
let a=fs.readFileSync(appFile,"utf8");
if(!a.includes("NOVA_GUEST_EXPERIENCE_V1")){
  const marker='const state={settings:null,conversations:[],memories:[],current:null,web:false,attachments:[],generating:false,requestId:null,usage:null,personalityModes:["smart","casual","sticker","serious","research"],user:null};';
  const guestCode=`
/* NOVA_GUEST_EXPERIENCE_V1 */
function showGuestNotice(){
  if(!state.user?.isGuest)return;
  let overlay=document.getElementById("guestNoticeOverlay");
  if(!overlay){
    overlay=document.createElement("div");
    overlay.id="guestNoticeOverlay";
    overlay.className="guest-notice-overlay";
    overlay.innerHTML=\`<section class="guest-notice-card" role="dialog" aria-modal="true"><div class="guest-danger">⚠️</div><h1>شما دارید از کاربر مهمان استفاده می‌کنید</h1><p>شما از کاربر مهمان استفاده می‌کنید. هر چتی که اینجا می‌کنید و حرف می‌زنید هیچ جا قرار نیست سیو بشه.</p><p>برای استفاده بهتر و تجربه بهتر از Nova AI وارد تنظیمات بشید، گزینه <b>ثبت نام</b> رو بزنید و اونجا می‌تونید یوزنیم و پسورد انتخاب کنید و اکانت بسازید؛ اکانت جدید مستقیماً به حساب مهمان شما وصل میشه و اطلاعات گفت‌وگوهای همین جلسه رو همراه خودش می‌بره.</p><button type="button" id="guestNoticeContinue" class="guest-notice-btn">متوجه شدم، ادامه می‌دم</button></section>\`;
    document.body.appendChild(overlay);
    document.getElementById("guestNoticeContinue").onclick=()=>overlay.classList.add("hidden");
  }
  overlay.classList.remove("hidden");
}
function ensureGuestSettingsOption(){
  if(!state.user?.isGuest)return;
  const panel=document.querySelector("#settingsOverlay .settings-scroll");
  if(!panel||document.getElementById("guestRegisterSection"))return;
  const box=document.createElement("div");
  box.className="settings-section guest-register-section";
  box.id="guestRegisterSection";
  box.innerHTML=\`<h3>🔐 ثبت نام</h3><p class="hint">اکانت بساز تا تجربه Nova کامل‌تر بشه. گفت‌وگوهای همین حساب مهمان مستقیماً به اکانت جدیدت منتقل می‌شن.</p><button type="button" id="guestRegisterBtn" class="primary-btn">ثبت نام و ساخت اکانت</button>\`;
  panel.insertBefore(box,panel.firstElementChild);
  document.getElementById("guestRegisterBtn").onclick=()=>{document.getElementById("settingsOverlay")?.classList.add("hidden");showRegisterScreen();};
}
const _novaOpenSettings=openSettings;
openSettings=function(){_novaOpenSettings();ensureGuestSettingsOption();};
const _novaCompleteAuth=completeAuth;
completeAuth=async function(user,errorEl){await _novaCompleteAuth(user,errorEl);if(state.user?.isGuest)showGuestNotice();};
`;
  if(!a.includes(marker)) throw new Error("Nova guest patch: app state anchor not found");
  a=a.replace(marker,marker+guestCode);
  const initOld='if(me.user){ state.user=me.user; hideAuthScreen(); await loadApp(); wireAppEvents(); }';
  const initNew='if(me.user){ state.user=me.user; hideAuthScreen(); await loadApp(); wireAppEvents(); if(state.user?.isGuest)showGuestNotice(); }';
  if(a.includes(initOld)) a=a.replace(initOld,initNew);
  fs.writeFileSync(appFile,a);
}

const cssFile=path.resolve("public/styles.css");
let c=fs.readFileSync(cssFile,"utf8");
if(!c.includes(".guest-notice-overlay")){
  c+=`\n/* Guest account warning */\n.guest-notice-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:22px;background:rgba(255,70,70,.13);backdrop-filter:blur(8px)}\n.guest-notice-overlay.hidden{display:none}\n.guest-notice-card{width:min(680px,100%);max-height:calc(100dvh - 44px);overflow:auto;border:1px solid rgba(239,68,68,.35);border-radius:28px;padding:30px 26px;text-align:center;background:linear-gradient(180deg,rgba(255,244,244,.98),rgba(255,230,230,.98));box-shadow:0 24px 90px rgba(170,20,20,.22);color:#5f1111;direction:rtl}\n.guest-danger{font-size:52px;line-height:1;margin-bottom:12px;animation:guestDangerPulse 1.5s ease-in-out infinite}\n.guest-notice-card h1{margin:0 0 18px;font-size:clamp(22px,5vw,32px);line-height:1.45;color:#c81e1e}\n.guest-notice-card p{margin:10px auto;max-width:590px;font-size:15px;line-height:2;color:#741c1c}\n.guest-notice-btn{margin-top:18px;padding:12px 20px;border-radius:13px;background:#dc2626;color:#fff;font-weight:800;box-shadow:0 8px 24px rgba(220,38,38,.22)}\n.guest-register-section{border:1px solid rgba(239,68,68,.24);background:rgba(239,68,68,.05);border-radius:18px;padding:18px}\n.guest-register-section .primary-btn{margin-top:8px}\n@keyframes guestDangerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}\nbody.dark .guest-notice-card{background:linear-gradient(180deg,rgba(50,17,17,.98),rgba(35,12,12,.98));color:#ffe5e5;border-color:rgba(248,113,113,.32)}\nbody.dark .guest-notice-card h1{color:#ff7777}\nbody.dark .guest-notice-card p{color:#ffd0d0}\n`;
  fs.writeFileSync(cssFile,c);
}
console.log("Nova guest experience patch ready");
