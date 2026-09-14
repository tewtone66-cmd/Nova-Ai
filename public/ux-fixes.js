(()=>{
  const $=s=>document.querySelector(s);
  const resetComposer=()=>{
    try{
      const send=$('#sendBtn');
      if(send){send.textContent='➤';send.title='ارسال';send.disabled=false;send.classList.remove('busy');}
      const ta=$('#composer');if(ta){ta.disabled=false;ta.removeAttribute('aria-busy');}
    }catch{}
  };
  window.addEventListener('unhandledrejection',e=>{
    const msg=e?.reason?.message||'یک مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کنید.';
    resetComposer();
    if(typeof window.toast==='function') window.toast(msg);
    e.preventDefault();
  });
  window.addEventListener('error',()=>resetComposer());

  const style=document.createElement('style');
  style.textContent=`
    .side-bottom{gap:7px}
    .side-action{position:relative;width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--text);font-size:13px;font-weight:650;text-align:right;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease}
    .side-action:hover{background:var(--surface2);border-color:var(--border);transform:translateY(-1px)}
    .side-action::before{content:'';width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 20%,var(--surface)),var(--surface2));border:1px solid color-mix(in srgb,var(--accent) 25%,var(--border));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 5px 14px rgba(0,0,0,.05)}
    #openSettings::before{content:'⚙';font-size:18px}
    #supportBtn::before{content:'';font-size:0;background:var(--accent);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M12 3a9 9 0 0 0-9 9v5a3 3 0 0 0 3 3h2v-8H5v-0.1A7 7 0 0 1 19 12V12h-3v8h2a3 3 0 0 0 3-3v-5a9 9 0 0 0-9-9Zm-8 9h2v5H6a1 1 0 0 1-1-1v-4Zm14 0h1v4a1 1 0 0 1-1 1h-1v-5Z'/%3E%3C/svg%3E") center/20px 20px no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M12 3a9 9 0 0 0-9 9v5a3 3 0 0 0 3 3h2v-8H5v-0.1A7 7 0 0 1 19 12V12h-3v8h2a3 3 0 0 0 3-3v-5a9 9 0 0 0-9-9Zm-8 9h2v5H6a1 1 0 0 1-1-1v-4Zm14 0h1v4a1 1 0 0 1-1-1v-4Z'/%3E%3C/svg%3E") center/20px 20px no-repeat}
    #openSettings,#supportBtn{font-size:0}
    #openSettings::after,#supportBtn::after{font-size:13px}
    #openSettings::after{content:'تنظیمات'}
    #supportBtn::after{content:'پشتیبانی'}
    .logout-action{margin-top:2px;color:var(--muted)}
    .logout-action::before{content:'↪';font-size:17px}
    .logout-action::after{content:'خروج از حساب';font-size:13px}
    .ai-mode-picker{position:relative;min-width:0;flex:0 1 145px}
    .ai-mode-picker-btn{width:100%;max-width:145px;min-width:0;display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ai-mode-picker-btn span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ai-mode-menu{position:absolute!important;bottom:calc(100% + 9px)!important;top:auto!important;right:0!important;left:auto!important;width:min(205px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:min(280px,calc(100dvh - 150px));overflow:auto;z-index:500!important;box-sizing:border-box}
    .ai-mode-menu button{width:100%;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:600px){.ai-mode-picker{flex:0 1 48px;width:48px}.ai-mode-picker-btn{width:48px;max-width:48px;padding:0 6px;font-size:0}.ai-mode-picker-btn span:last-child{font-size:14px}.ai-mode-menu{right:0!important;width:min(205px,calc(100vw - 18px))!important}}
    #supportOverlay{align-items:center;justify-content:center;padding:18px;z-index:160}
    .support-panel{width:min(520px,100%);height:min(690px,calc(100dvh - 36px));display:flex;flex-direction:column;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border));border-radius:26px;background:var(--surface);box-shadow:0 28px 90px rgba(0,0,0,.24)}
    .support-panel .settings-head{padding:18px 20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,transparent),transparent)}
    .support-panel .settings-head h2{font-size:19px}
    .support-messages{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:10px}
    .support-msg{max-width:86%;padding:12px 14px;border-radius:17px;border:1px solid var(--border);line-height:1.7;font-size:13px;box-shadow:0 8px 25px rgba(0,0,0,.05);white-space:pre-wrap}
    .support-bot{align-self:flex-start;background:var(--surface)}.support-user{align-self:flex-end;background:var(--accent);color:#fff;border-color:transparent}
    .support-msg b{display:block;font-size:11px;margin-bottom:4px;opacity:.72}
    .support-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border);background:var(--surface)}
    .support-form input{min-width:0;flex:1;border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:14px;padding:11px 13px;outline:0}
    .support-form input:focus{border-color:color-mix(in srgb,var(--accent) 60%,var(--border))}
    .support-form button[disabled]{opacity:.55;cursor:wait}.support-typing{opacity:.7}
    #settingsBtn{font-size:0;position:relative}
    #settingsBtn::before{content:'⚙';font-size:20px;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 16%,var(--surface)),var(--surface2));border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border))}
    #supportOverlay .icon-btn{background:var(--surface2);border:1px solid var(--border)}

    .nova-v2 .chat-list{contain:strict}
    .nova-v2 .messages{contain:layout style}
    .nova-v2 .message{contain:layout paint}
    .nova-v2 .quick-grid button{content-visibility:auto;contain:layout paint}
    .nova-v2 .composer{contain:layout paint}
    .nova-v2 .chat-view{overscroll-behavior:contain;scrollbar-gutter:stable}
    .nova-v2 .sidebar,.nova-v2 .settings-panel{will-change:transform}
    .nova-v2 button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  `;
  document.head.appendChild(style);

  const setupV2=()=>{
    document.body.classList.add('nova-v2');
    const side=$('#sidebar'),view=$('#chatView');
    document.addEventListener('click',e=>{
      if(!side?.classList.contains('open'))return;
      if(e.target.closest('#sidebar,#openSide'))return;
      side.classList.remove('open');
    },{passive:true});
    if(view){
      let nearBottom=true;
      view.addEventListener('scroll',()=>{nearBottom=view.scrollHeight-view.scrollTop-view.clientHeight<90},{passive:true});
      window.__novaNearBottom=()=>nearBottom;
    }
    const send=$('#sendBtn');
    if(send){
      new MutationObserver(()=>{if(send.title!=='توقف تولید')send.dataset.busy='0'}).observe(send,{attributes:true,attributeFilter:['title']});
    }
    document.addEventListener('click',e=>{
      const b=e.target.closest('#sendBtn');
      if(!b||b.title==='توقف تولید'||b.dataset.busy!=='1')return;
      e.preventDefault();e.stopImmediatePropagation();
    },true);
    document.addEventListener('click',e=>{
      const b=e.target.closest('.quick-grid button');
      if(b) requestAnimationFrame(()=>$('#composer')?.focus());
    },{passive:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupV2,{once:true});else setupV2();

  // Theme bridge: the legacy app stores light/dark in its settings but only
  // toggles the .dark class. The new Nova 2.0 stylesheet uses .light as the
  // explicit light-theme opt-in, so mirror the legacy state without touching
  // the application's settings or behavior.
  const syncTheme=()=>{
    document.body.classList.toggle('light',!document.body.classList.contains('dark'));
  };
  new MutationObserver(syncTheme).observe(document.body,{attributes:true,attributeFilter:['class']});
  syncTheme();

  function setupSupport(){
    const btn=$('#supportBtn'),overlay=$('#supportOverlay'),close=$('#closeSupport'),form=$('#supportForm'),input=$('#supportInput'),box=$('#supportMessages');
    if(!btn||!overlay||!form||!input||!box)return;
    const history=[];let busy=false;
    const add=(text,type='bot',extraClass='')=>{
      const el=document.createElement('div');el.className='support-msg '+(type==='user'?'support-user':'support-bot')+' '+extraClass;
      const b=document.createElement('b');b.textContent=type==='user'?'شما':'پشتیبانی Nova';
      const p=document.createElement('div');p.textContent=text;el.append(b,p);box.appendChild(el);box.scrollTop=box.scrollHeight;return el;
    };
    const open=()=>{overlay.classList.remove('hidden');setTimeout(()=>input.focus(),60)};
    const hide=()=>overlay.classList.add('hidden');
    btn.addEventListener('click',open);close?.addEventListener('click',hide);
    overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});
    form.addEventListener('submit',async e=>{
      e.preventDefault();const text=input.value.trim();if(!text||busy)return;
      busy=true;input.value='';input.disabled=true;form.querySelector('button').disabled=true;add(text,'user');history.push({role:'user',content:text});
      const typing=add('در حال بررسی پیام...','bot','support-typing');
      try{
        const r=await fetch('/api/chat',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,kind:'support',useWeb:false})});
        if(!r.ok){const j=await r.json().catch(()=>null);throw new Error(j?.error?.message||'خطا در پشتیبانی Nova');}
        const reader=r.body.getReader(),dec=new TextDecoder();let buf='',answer='';
        while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split('\n\n');buf=parts.pop()||'';for(const p of parts){if(!p.startsWith('data:'))continue;const d=JSON.parse(p.slice(5));if(d.type==='delta')answer+=d.delta;else if(d.type==='model_limit')answer=d.message;else if(d.type==='error')throw new Error(d.message||'خطا در پشتیبانی Nova');}}
        if(!answer)answer='پاسخی دریافت نشد. دوباره تلاش کن.';typing.remove();add(answer,'bot');history.push({role:'assistant',content:answer});
      }catch(err){typing.remove();add(err?.message||'خطا در پشتیبانی Nova','bot');}
      finally{busy=false;input.disabled=false;form.querySelector('button').disabled=false;input.focus();}
    });
  }
  setupSupport();
})();