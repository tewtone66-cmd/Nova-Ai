(()=>{
  const $=s=>document.querySelector(s);
  const resetComposer=()=>{
    try{
      if(window.state) window.state.generating=false;
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
    /* compact premium sidebar actions */
    .side-bottom{gap:7px}
    .side-action{position:relative;width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--text);font-size:13px;font-weight:650;text-align:right;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease}
    .side-action:hover{background:var(--surface2);border-color:var(--border);transform:translateY(-1px)}
    .side-action::before{content:'';width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 20%,var(--surface)),var(--surface2));border:1px solid color-mix(in srgb,var(--accent) 25%,var(--border));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 5px 14px rgba(0,0,0,.05)}
    #openSettings::before{content:'⚙';font-size:18px}
    #supportBtn::before{content:'◈';font-size:17px}
    #openSettings,#supportBtn{font-size:0}
    #openSettings::after,#supportBtn::after{font-size:13px}
    #openSettings::after{content:'تنظیمات'}
    #supportBtn::after{content:'پشتیبانی'}
    .logout-action{margin-top:2px;color:var(--muted)}
    .logout-action::before{content:'↪';font-size:17px}
    .logout-action::after{content:'خروج از حساب';font-size:13px}

    /* mode picker: never escape the composer viewport */
    .ai-mode-picker{position:relative;min-width:0;flex:0 1 145px}
    .ai-mode-picker-btn{width:100%;max-width:145px;min-width:0;display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ai-mode-picker-btn span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ai-mode-menu{position:absolute!important;bottom:calc(100% + 9px)!important;top:auto!important;right:0!important;left:auto!important;width:min(205px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:min(280px,calc(100dvh - 150px));overflow:auto;z-index:500!important;box-sizing:border-box}
    .ai-mode-menu button{width:100%;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:600px){
      .ai-mode-picker{flex:0 1 48px;width:48px}
      .ai-mode-picker-btn{width:48px;max-width:48px;padding:0 6px;font-size:0}
      .ai-mode-picker-btn span:last-child{font-size:14px}
      .ai-mode-menu{right:0!important;width:min(205px,calc(100vw - 18px))!important}
    }

    /* premium custom support panel */
    #supportOverlay{align-items:center;justify-content:center;padding:18px;z-index:160}
    .support-panel{width:min(520px,100%);height:min(690px,calc(100dvh - 36px));display:flex;flex-direction:column;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border));border-radius:26px;background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(24px);box-shadow:0 28px 90px rgba(0,0,0,.24)}
    .support-panel .settings-head{padding:18px 20px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,transparent),transparent)}
    .support-panel .settings-head h2{font-size:19px}
    .support-messages{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:10px;background:radial-gradient(circle at 20% 0,color-mix(in srgb,var(--accent) 7%,transparent),transparent 40%)}
    .support-msg{max-width:86%;padding:12px 14px;border-radius:17px;border:1px solid var(--border);line-height:1.7;font-size:13px;box-shadow:0 8px 25px rgba(0,0,0,.05)}
    .support-bot{align-self:flex-start;background:var(--surface)}
    .support-user{align-self:flex-end;background:var(--accent);color:#fff;border-color:transparent}
    .support-msg b{display:block;font-size:11px;margin-bottom:4px;opacity:.72}
    .support-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border);background:color-mix(in srgb,var(--surface) 94%,transparent)}
    .support-form input{min-width:0;flex:1;border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:14px;padding:11px 13px;outline:0}
    .support-form input:focus{border-color:color-mix(in srgb,var(--accent) 60%,var(--border));box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent)}

    /* settings gets the same custom icon treatment */
    #settingsBtn{font-size:0;position:relative}
    #settingsBtn::before{content:'⚙';font-size:20px;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 16%,var(--surface)),var(--surface2));border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border));box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 5px 15px rgba(0,0,0,.06)}
    #supportOverlay .icon-btn{background:var(--surface2);border:1px solid var(--border)}
  `;
  document.head.appendChild(style);

  function setupSupport(){
    const btn=$('#supportBtn'),overlay=$('#supportOverlay'),close=$('#closeSupport'),form=$('#supportForm'),input=$('#supportInput'),box=$('#supportMessages');
    if(!btn||!overlay||!form||!input||!box)return;
    const add=(text,type='bot')=>{
      const el=document.createElement('div');el.className='support-msg '+(type==='user'?'support-user':'support-bot');
      const b=document.createElement('b');b.textContent=type==='user'?'شما':'پشتیبانی Nova';
      const p=document.createElement('div');p.textContent=text;el.append(b,p);box.appendChild(el);box.scrollTop=box.scrollHeight;
    };
    const open=()=>{overlay.classList.remove('hidden');setTimeout(()=>input.focus(),60)};
    const hide=()=>overlay.classList.add('hidden');
    btn.addEventListener('click',open);close?.addEventListener('click',hide);
    overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});
    form.addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text)return;add(text,'user');input.value='';setTimeout(()=>add('پیامت دریافت شد. این پشتیبانی فعلاً آزمایشی است و به تیم واقعی وصل نیست.'),450)});
  }
  setupSupport();
})();