const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={settings:null,conversations:[],memories:[],current:null,web:false,attachments:[],generating:false,requestId:null,usage:null,personalityModes:["smart","casual","sticker","serious","research"],user:null};
let revealObserver;

function setupRevealObserver(){
  if(revealObserver) revealObserver.disconnect();
  revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },{root:$("#chatView"),threshold:.08,rootMargin:"0px 0px -30px 0px"});
}
function observeReveals(){
  if(!revealObserver) setupRevealObserver();
  $$(".reveal:not(.is-visible)").forEach(el=>revealObserver.observe(el));
}
function smoothScrollToBottom(){
  const view=$("#chatView");
  requestAnimationFrame(()=>view.scrollTo({top:view.scrollHeight,behavior:"smooth"}));
}

const memoryCategoryLabels={personal:"شخصی",preferences:"سلیقه‌ها",work:"کاری",projects:"پروژه‌ها"};
const themes={green:"#20a66a",blue:"#3b82f6",purple:"#8b5cf6",pink:"#ec4899",orange:"#f97316",red:"#ef4444",turquoise:"#14b8a6",gold:"#d4a72c",black:"#242424",gray:"#6b7280"};

async function api(url,opt={}){
  const r=await fetch(url,{credentials:"include",...opt});
  const ct=r.headers.get("content-type")||"";
  if(!ct.includes("application/json")) throw new Error("Server returned non-JSON response");
  const d=await r.json();
  if(r.status===401){ showAuthScreen(); throw new Error(d.error?.message||"لطفاً دوباره وارد شوید."); }
  if(!r.ok||d.ok===false)throw new Error(d.error?.message||"Request failed");
  return d;
}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2300)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function md(s){
  const imageMatch=String(s).match(/^!\[generated-image\]\((data:image\/[^;]+;base64,[^)]+)\)$/);
  if(imageMatch) return `<img src="${imageMatch[1]}" style="display:block;max-width:100%;border-radius:14px" alt="Generated image">`;
  let x=escapeHtml(s);
  x=x.replace(/```([\s\S]*?)```/g,(_,c)=>`<pre><code>${c.trim()}</code></pre>`);
  x=x.replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\*([^*]+)\*/g,"<i>$1</i>");
  x=x.replace(/\n/g,"<br>");
  return x;
}
function avatarHTML(src,fallback,cls="avatar"){return src?`<div class="${cls}"><img src="${src}"></div>`:`<div class="${cls}">${escapeHtml(fallback)}</div>`}

// ---- auth screen ---------------------------------------------------------
function showAuthScreen(){
  $("#app").classList.add("hidden");
  $("#authScreen").classList.remove("hidden");
}
function hideAuthScreen(){
  $("#authScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
}
function switchToRegister(){
  $("#loginForm").classList.add("hidden"); $("#registerForm").classList.remove("hidden");
  $("#toRegisterWrap").classList.add("hidden"); $("#toLoginWrap").classList.remove("hidden");
  $("#authSubtitle").textContent="یه حساب جدید برای خودت بساز";
}
function switchToLogin(){
  $("#registerForm").classList.add("hidden"); $("#loginForm").classList.remove("hidden");
  $("#toLoginWrap").classList.add("hidden"); $("#toRegisterWrap").classList.remove("hidden");
  $("#authSubtitle").textContent="برای ادامه وارد حساب کاربری‌ت شو";
}

// ---- appearance -----------------------------------------------------------
function applyAppearance(){
  const s=state.settings;
  document.body.classList.toggle("dark",s.mode==="dark");
  document.body.className=document.body.className.replace(/\banim-\S+/g,"").trim();
  document.body.classList.add("anim-"+(s.animationLevel||"normal"));
  if(s.mode==="dark") document.body.classList.add("dark");
  const accent=s.theme==="custom"?s.customAccent:(themes[s.theme]||themes.green);
  document.documentElement.style.setProperty("--accent",accent);
  document.documentElement.style.setProperty("--accent2",accent);
  const name=s.novaName||"Nova";
  $("#brandName").textContent=name;$("#mobileName").textContent=name;$("#heroName").textContent=name;
  $("#userName").textContent=s.userName||"کاربر";
  [["brandAvatar",s.novaAvatar,name[0]||"N"],["mobileAvatar",s.novaAvatar,name[0]||"N"],["heroAvatar",s.novaAvatar,name[0]||"N"],["userAvatar",s.userAvatar,s.userName?.[0]||"U"]].forEach(([id,src,fb])=>{
    const e=$("#"+id);e.innerHTML=src?`<img src="${src}">`:escapeHtml(fb);});
  $("#statusText").textContent=s.novaEnabled?"Nova ON":"Nova OFF";
  $("#novaToggle").classList.toggle("on",s.novaEnabled);
  $("#autoSpeakToggle").classList.toggle("on",Boolean(s.autoSpeak));
  $("#memoryEnabledToggle").classList.toggle("on",s.memoryEnabled!==false);
  updateLimit();
}
function updateLimit(){
  const u=state.usage;
  const n=u?u.percent:Math.max(0,Math.min(100,Number(state.settings?.limit)||100));
  $("#limitText").textContent=n+"%";$("#limitFill").style.width=n+"%";
  const c=n>=80?"#20a66a":n>=50?"#eab308":n>=30?"#f97316":"#ef4444";
  $("#limitFill").style.background=c;
  $("#limitDetail").textContent=u?`${u.tokensUsed.toLocaleString()} / ${u.quota.toLocaleString()} توکن`:"";
}

// ---- chat list ------------------------------------------------------------
function renderChats(filter=""){
  const list=$("#chatList");list.innerHTML="";
  state.conversations.filter(c=>c.title.toLowerCase().includes(filter.toLowerCase())).forEach(c=>{
    const b=document.createElement("div");b.className="chat-item"+(state.current?.id===c.id?" active":"");
    b.innerHTML=`<span class="chat-title">${escapeHtml(c.title)}</span><button class="rename" title="تغییر نام">✎</button><button class="delete" title="حذف">×</button>`;
    b.onclick=()=>openChat(c.id);
    b.querySelector(".rename").onclick=async e=>{
      e.stopPropagation();
      const next=prompt("نام جدید گفتگو:",c.title);
      if(next&&next.trim()){ await api("/api/conversations/"+c.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:next.trim()})}); c.title=next.trim(); renderChats(filter); }
    };
    b.querySelector(".delete").onclick=async e=>{e.stopPropagation();await api("/api/conversations/"+c.id,{method:"DELETE"});state.conversations=state.conversations.filter(x=>x.id!==c.id);if(state.current?.id===c.id)state.current=null;renderChats();renderMessages();};
    list.appendChild(b);
  });
}

// ---- messages ---------------------------------------------------------------
function speak(text){
  if(!("speechSynthesis" in window)) return toast("مرورگر شما از خواندن صوتی پشتیبانی نمی‌کند.");
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g,"").slice(0,600));
  u.lang=state.settings.voiceLang||"fa-IR";
  window.speechSynthesis.speak(u);
}
function renderMessages(animate=true){
  const box=$("#messages");box.innerHTML="";
  if(!state.current){$("#welcome").style.display="block";return}
  $("#welcome").style.display="none";
  state.current.messages.forEach((m,i)=>{
    const row=document.createElement("article");
    row.className="message "+m.role+(animate?" reveal":"");
    const isUser=m.role==="user";
    const src=isUser?state.settings.userAvatar:state.settings.novaAvatar;
    const fb=isUser?(state.settings.userName?.[0]||"U"):(state.settings.novaName?.[0]||"N");
    const typing=m.role==="assistant"&&!m.content;
    row.innerHTML=`${avatarHTML(src,fb)}<div class="message-content"><div class="bubble ${typing?"typing-bubble":""}">${typing?'<span class="typing-dots"><i></i><i></i><i></i></span>':m.role==="assistant"?md(m.content):escapeHtml(m.content).replace(/\n/g,"<br>")}</div>${!isUser&&!typing?`<div class="message-actions"><button data-copy>کپی</button><button data-speak>🔊 پخش</button><button data-retry>تلاش دوباره</button></div>`:""}</div>`;
    row.querySelector("[data-copy]")?.addEventListener("click",()=>navigator.clipboard.writeText(m.content).then(()=>toast("کپی شد")));
    row.querySelector("[data-speak]")?.addEventListener("click",()=>speak(m.content));
    row.querySelector("[data-retry]")?.addEventListener("click",()=>retryMessage(i));
    box.appendChild(row);
  });
  observeReveals();
  if(animate) smoothScrollToBottom();
  else $("#chatView").scrollTop=$("#chatView").scrollHeight;
}
async function openChat(cid){state.current=state.conversations.find(c=>c.id===cid);renderChats();renderMessages();$("#sidebar").classList.remove("open")}
async function newChat(){
  const d=await api("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"گفت‌وگوی جدید"})});
  state.conversations.unshift(d.conversation);await openChat(d.conversation.id);
}
function autoTitle(text){return text.replace(/\s+/g," ").trim().slice(0,42)||"گفت‌وگوی جدید"}
async function stopGeneration(){
  if(!state.generating || !state.requestId) return;
  try{await api("/api/chat/stop",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:state.requestId})})}catch{}
}

async function send(textOverride){
  if(state.generating)return;
  const input=$("#composer"), text=(textOverride??input.value).trim(); if(!text)return;
  if(!state.settings.novaEnabled)return toast("Nova خاموش است؛ از تنظیمات روشنش کن.");
  if(state.usage && state.usage.remaining<=0)return toast("⚡ اعتبار روزانه‌ی شما به پایان رسیده.");
  const isNewConvo=!state.current;
  if(!state.current)await newChat();
  if(state.current.title==="گفت‌وگوی جدید"){state.current.title=autoTitle(text);renderChats();}
  const userMsg={role:"user",content:text};state.current.messages.push(userMsg);renderMessages();input.value="";resizeComposer();
  state.generating=true;$("#sendBtn").textContent="■";$("#sendBtn").title="توقف تولید";
  const assistant={role:"assistant",content:""};state.current.messages.push(assistant);renderMessages();
  const kind=/\b(code|coding|debug|python|javascript|typescript|html|css)\b|کد|برنامه‌نویسی|باگ|خطا/i.test(text)?"coding":/عکس|تصویر|image|photo|picture|بساز/i.test(text)?"image":"text";
  if(kind==="image"){state.current.messages.pop();renderMessages();await generateImage(text);state.generating=false;$("#sendBtn").textContent="➤";return;}
  try{
    const r=await fetch("/api/chat",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:state.current.messages.slice(0,-1),kind,useWeb:state.web})});
    state.requestId=null;
    if(r.status===401){showAuthScreen();throw new Error("لطفاً دوباره وارد شوید.")}
    if(!r.ok){let j=await r.json().catch(()=>null);throw new Error(j?.error?.message||"خطا در اتصال");}
    const reader=r.body.getReader(),dec=new TextDecoder();let buf="";
    while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split("\n\n");buf=parts.pop()||"";
      for(const p of parts){if(!p.startsWith("data:"))continue;const d=JSON.parse(p.slice(5));if(d.requestId)state.requestId=d.requestId;if(d.type==="delta"){assistant.content+=d.delta;renderMessages(false)}else if(d.type==="done"){state.usage=d.usage;updateLimit()}else if(d.type==="error"){throw new Error(d.message)}}
    }
    await saveCurrent();
    if(state.settings.autoSpeak) speak(assistant.content);
    if(isNewConvo) autoTitleConversation(state.current.id);
  }catch(e){assistant.content="⚠️ "+e.message;renderMessages();toast(e.message)}
  finally{state.generating=false;state.requestId=null;$("#sendBtn").textContent="➤";$("#sendBtn").title="ارسال";state.web=false;$("#webBtn").classList.remove("active")}
}
async function autoTitleConversation(cid){
  try{
    const d=await api(`/api/conversations/${cid}/title`,{method:"POST"});
    const c=state.conversations.find(x=>x.id===cid);
    if(c && d.conversation?.title){ c.title=d.conversation.title; renderChats(); }
  }catch{}
}
async function retryMessage(i){const m=state.current.messages[i];if(!m)return;state.current.messages.splice(i,1);const prev=state.current.messages[i-1];if(prev?.role==="user"){state.current.messages.splice(i-1,1);await send(prev.content)}}
async function saveCurrent(){if(state.current)await api("/api/conversations/"+state.current.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:state.current.title,messages:state.current.messages})})}

async function generateImage(prompt){
  const fd=new FormData();fd.append("prompt",prompt);
  if(state.attachments[0]?.file)fd.append("reference",state.attachments[0].file);
  try{
    const d=await api("/api/image",{method:"POST",body:fd});
    state.usage=d.usage;updateLimit();
    state.current.messages.push({role:"assistant",content:"![generated-image](data:image/png;base64,"+d.b64+")"});
    renderMessages();await saveCurrent();
  }catch(e){toast(e.message);state.current.messages.push({role:"assistant",content:"⚠️ "+e.message});renderMessages()}
}

// ---- settings ---------------------------------------------------------------
function openSettings(){fillSettings();$("#settingsOverlay").classList.remove("hidden")}
function fillSettings(){
  const s=state.settings;
  $("#novaName").value=s.novaName;$("#novaBio").value=s.novaBio;$("#userNameInput").value=s.userName;$("#userBio").value=s.userBio;$("#customPrompt").value=s.customPrompt;$("#customAccent").value=s.customAccent||"#20a66a";
  $("#novaPreview").innerHTML=s.novaAvatar?`<img src="${s.novaAvatar}">`:(s.novaName?.[0]||"N");$("#userPreview").innerHTML=s.userAvatar?`<img src="${s.userAvatar}">`:(s.userName?.[0]||"U");

  const moodIndex=Math.max(0,state.personalityModes.indexOf(s.personality));
  $("#moodSlider").value=moodIndex;
  updateMoodLabels(moodIndex);

  $("#themeGrid").innerHTML=Object.entries(themes).map(([k,v])=>`<button class="theme-btn ${s.theme===k?"active":""}" data-t="${k}"><div class="theme-dot" style="background:${v}"></div>${k}</button>`).join("")+`<button class="theme-btn ${s.theme==="custom"?"active":""}" data-t="custom"><div class="theme-dot" style="background:${s.customAccent}"></div>Custom</button>`;
  $$("#themeGrid .theme-btn").forEach(b=>b.onclick=()=>{$$("#themeGrid .theme-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.settings.theme=b.dataset.t;applyAppearance()});

  $$(".segmented button[data-mode]").forEach(b=>{b.classList.toggle("active",b.dataset.mode===s.mode);b.onclick=()=>{state.settings.mode=b.dataset.mode;$$(".segmented button[data-mode]").forEach(x=>x.classList.remove("active"));b.classList.add("active");applyAppearance()}});

  $$("#animSegmented button").forEach(b=>{b.classList.toggle("active",b.dataset.anim===(s.animationLevel||"normal"));b.onclick=()=>{state.settings.animationLevel=b.dataset.anim;$$("#animSegmented button").forEach(x=>x.classList.remove("active"));b.classList.add("active");applyAppearance()}});

  renderMemoryCategoryChips();
  renderMemoryList();
}
function updateMoodLabels(idx){
  $$(".mood-labels span").forEach(el=>el.classList.toggle("active",Number(el.dataset.i)===Number(idx)));
}
function renderMemoryCategoryChips(){
  const cats=state.settings.memoryCategories||{};
  $("#memoryCategoryChips").innerHTML=Object.entries(memoryCategoryLabels).map(([k,label])=>
    `<button class="chip memory-cat ${cats[k]?"active":""}" data-cat="${k}">${label}</button>`).join("");
  $$("#memoryCategoryChips .memory-cat").forEach(b=>b.onclick=()=>{
    const k=b.dataset.cat; state.settings.memoryCategories[k]=!state.settings.memoryCategories[k];
    b.classList.toggle("active",state.settings.memoryCategories[k]);
  });
}
function renderMemoryList(){
  $("#memoryList").innerHTML=state.memories.length?state.memories.map(m=>`<div class="memory-item"><span>${escapeHtml(m.text)}<span class="tag ${m.auto?"auto":""}">${m.auto?"خودکار":"دستی"} · ${memoryCategoryLabels[m.category]||m.category||""}</span></span><button data-del="${m.id}">×</button></div>`).join(""):"<span class='hint'>هنوز Memory ذخیره نشده.</span>";
  $$("#memoryList [data-del]").forEach(b=>b.onclick=async()=>{await api("/api/memories/"+b.dataset.del,{method:"DELETE"});state.memories=state.memories.filter(m=>m.id!==b.dataset.del);renderMemoryList()});
}
async function saveSettings(){
  state.settings.novaName=$("#novaName").value.trim()||"Nova";state.settings.novaBio=$("#novaBio").value;state.settings.userName=$("#userNameInput").value.trim()||"کاربر";state.settings.userBio=$("#userBio").value;state.settings.customPrompt=$("#customPrompt").value;state.settings.customAccent=$("#customAccent").value;
  state.settings.personality=state.personalityModes[Number($("#moodSlider").value)]||"smart";
  const d=await api("/api/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(state.settings)});state.settings=d.settings;applyAppearance();$("#settingsOverlay").classList.add("hidden");toast("تنظیمات ذخیره شد")}
function fileToData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
async function handleFiles(files){
  for(const f of files){if(f.size>15*1024*1024){toast("حجم فایل بیشتر از ۱۵MB است");continue}
    try{const d=await api("/api/upload",{method:"POST",body:(()=>{const fd=new FormData();fd.append("file",f);return fd})()});state.attachments.push({file:f,data:d.file});}
    catch(e){toast(e.message)}
  }
  $("#attachmentBar").innerHTML=state.attachments.map((x,i)=>`<div class="file-chip">${escapeHtml(x.file.name)} ×</div>`).join("");
  if(state.attachments.length) $("#composer").value+=`\n[فایل پیوست‌شده: ${state.attachments.map(x=>x.file.name).join(", ")}]`;
}
function resizeComposer(){const e=$("#composer");e.style.height="auto";e.style.height=Math.min(e.scrollHeight,180)+"px"}

// ---- voice input (Web Speech API) -------------------------------------------
let recognizer=null, isRecording=false;
function setupVoiceInput(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ $("#micBtn").style.display="none"; return; }
  recognizer=new SR();
  recognizer.continuous=false;
  recognizer.interimResults=false;
  recognizer.onresult=(e)=>{
    const transcript=e.results[0][0].transcript;
    $("#composer").value=($("#composer").value+" "+transcript).trim();
    resizeComposer();
  };
  recognizer.onerror=()=>{ toast("خطا در تشخیص صدا"); stopRecording(); };
  recognizer.onend=()=>stopRecording();
}
function startRecording(){
  if(!recognizer)return toast("مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند.");
  recognizer.lang=state.settings?.voiceLang||"fa-IR";
  isRecording=true; $("#micBtn").classList.add("recording");
  try{recognizer.start()}catch{}
}
function stopRecording(){
  isRecording=false; $("#micBtn").classList.remove("recording");
  try{recognizer?.stop()}catch{}
}

function initRevealAnimations(){
  $$(".welcome > *,.quick-grid button,.side-top > *, .side-bottom > *, .topbar > *, .limit-row > *").forEach((el,i)=>{
    el.classList.add("reveal");
    el.style.setProperty("--reveal-delay",`${Math.min(i,8)*55}ms`);
  });
  observeReveals();
}

// ---- app bootstrap ------------------------------------------------------------
async function loadApp(){
  const d=await api("/api/state");
  Object.assign(state,{settings:d.settings,conversations:d.conversations,memories:d.memories,usage:d.usage,personalityModes:d.personalityModes||state.personalityModes});
  applyAppearance();renderChats();renderMessages();initRevealAnimations();
}

function wireAppEvents(){
  $("#newChat").onclick=newChat;$("#openSide").onclick=()=>$("#sidebar").classList.add("open");$("#closeSide").onclick=()=>$("#sidebar").classList.remove("open");$("#settingsBtn").onclick=openSettings;$("#openSettings").onclick=openSettings;$("#closeSettings").onclick=()=>$("#settingsOverlay").classList.add("hidden");
  $("#saveSettings").onclick=saveSettings;$("#profileShortcut").onclick=openSettings;$("#chatSearch").oninput=e=>renderChats(e.target.value);
  $("#sendBtn").onclick=()=>state.generating?stopGeneration():send();$("#composer").oninput=resizeComposer;$("#composer").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}};
  $("#attachBtn").onclick=()=>$("#fileInput").click();$("#fileInput").onchange=e=>handleFiles(e.target.files);
  $("#micBtn").onclick=()=>isRecording?stopRecording():startRecording();
  $("#webBtn").onclick=()=>{state.web=!state.web;$("#webBtn").classList.toggle("active",state.web);toast(state.web?"جستجوی وب فعال شد":"جستجوی وب خاموش شد")};
  $("#imageBtn").onclick=()=>{$("#composer").focus();toast("پرامپت تصویر را بنویس و ارسال کن")};
  $$(".quick-grid button").forEach(b=>b.onclick=()=>{const a=b.dataset.action; if(a==="image")$("#composer").value="یک تصویر حرفه‌ای بساز: "; else if(a==="coding")$("#composer").value="به من در کدنویسی کمک کن: "; else if(a==="ideas")$("#composer").value="برای من ایده‌پردازی کن درباره: "; else if(a==="web"){state.web=true;$("#webBtn").classList.add("active");$("#composer").focus();return} else if(a==="file")$("#fileInput").click();$("#composer").focus();resizeComposer()});
  $("#novaToggle").onclick=()=>{state.settings.novaEnabled=!state.settings.novaEnabled;applyAppearance()};
  $("#autoSpeakToggle").onclick=()=>{state.settings.autoSpeak=!state.settings.autoSpeak;applyAppearance()};
  $("#memoryEnabledToggle").onclick=()=>{state.settings.memoryEnabled=!state.settings.memoryEnabled;applyAppearance()};
  $("#clearMemory").onclick=async()=>{ if(!confirm("کل حافظه پاک شود؟"))return; await api("/api/memories",{method:"DELETE"}); state.memories=[]; renderMemoryList(); toast("حافظه پاک شد"); };
  $("#moodSlider").oninput=e=>updateMoodLabels(e.target.value);
  $("#novaAvatarInput").onchange=async e=>{if(e.target.files[0])state.settings.novaAvatar=await fileToData(e.target.files[0]);fillSettings();applyAppearance()};
  $("#userAvatarInput").onchange=async e=>{if(e.target.files[0])state.settings.userAvatar=await fileToData(e.target.files[0]);fillSettings();applyAppearance()};
  $("#logoutBtn").onclick=async()=>{ await api("/api/auth/logout",{method:"POST"}).catch(()=>{}); state.user=null; location.reload(); };
}

function wireAuthEvents(){
  $("#toRegister").onclick=switchToRegister;
  $("#toLogin").onclick=switchToLogin;

  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault();
    $("#loginError").textContent="";
    try{
      const d=await api("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("#loginUsername").value.trim(),password:$("#loginPassword").value})});
      state.user=d.user; hideAuthScreen(); await loadApp(); wireAppEvents();
    }catch(err){ $("#loginError").textContent=err.message; }
  });

  $("#registerForm").addEventListener("submit", async e=>{
    e.preventDefault();
    $("#registerError").textContent="";
    try{
      const d=await api("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        username:$("#regUsername").value.trim(), password:$("#regPassword").value,
        email:$("#regEmail").value.trim(), phone:$("#regPhone").value.trim()
      })});
      state.user=d.user; hideAuthScreen(); await loadApp(); wireAppEvents();
    }catch(err){ $("#registerError").textContent=err.message; }
  });
}

async function init(){
  setupVoiceInput();
  wireAuthEvents();
  try{
    const me=await api("/api/auth/me");
    if(me.user){ state.user=me.user; hideAuthScreen(); await loadApp(); wireAppEvents(); }
    else { showAuthScreen(); }
  }catch{ showAuthScreen(); }
}
init().catch(e=>toast(e.message));
