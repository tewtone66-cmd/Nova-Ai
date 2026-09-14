(() => {
  'use strict';
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const on=(e,n,f,o)=>e&&e.addEventListener(n,f,o);

  const css=document.createElement('style');
  css.textContent=`
    *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    button:focus{outline:none!important}button:focus-visible{outline:2px solid color-mix(in srgb,var(--accent,#20a66a) 55%,transparent)!important;outline-offset:2px}

    /* Restore the clean V5 home: no six-card suggestion grid. */
    #welcome .quick-grid,.quick-grid,.nova-v5-suggestions,.suggestions,.suggestion-grid,.prompt-suggestions,.quick-prompts,.home-suggestions,.welcome-suggestions,[class*="suggestion"]{display:none!important}
    #welcome{padding-bottom:120px!important}

    /* Restore the compact bottom composer layout used before the update-log UI pass. */
    .composer-wrap{left:calc(50% + 135px)!important;width:min(900px,calc(100vw - 312px))!important;transform:translateX(-50%)!important;padding-left:14px!important;padding-right:14px!important}
    .composer{width:100%!important;max-width:none!important;display:grid!important;grid-template-columns:36px 36px minmax(0,1fr) 36px 36px!important;grid-template-rows:minmax(36px,auto)!important;align-items:center!important;gap:8px!important;direction:ltr!important;padding:7px!important;box-sizing:border-box!important}
    .composer>*{min-width:0;margin:0!important}
    .ai-mode-picker{grid-column:1!important;grid-row:1!important;width:36px!important;height:36px!important;position:relative!important}
    .ai-mode-picker-btn{width:36px!important;height:36px!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:12px!important}
    .ai-mode-picker-btn span:first-child{display:none!important}.ai-mode-picker-btn span:last-child{margin:0!important;font-size:18px!important;line-height:1!important}
    .ai-mode-menu{display:none!important;position:absolute!important;bottom:calc(100% + 8px)!important;left:0!important;z-index:1000!important}.ai-mode-menu.open{display:block!important}
    #attachBtn{grid-column:2!important;grid-row:1!important;width:36px!important;height:36px!important}
    #composer{grid-column:3!important;grid-row:1!important;width:100%!important;min-width:0!important;direction:rtl!important;text-align:right!important;align-self:center!important}
    #micBtn{grid-column:4!important;grid-row:1!important;width:36px!important;height:36px!important;position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:0!important}
    .composer-tools{display:contents!important}#webBtn,#imageBtn,.web-search-btn,.image-prompt-btn,.prompt-btn{display:none!important}
    #sendBtn{grid-column:5!important;grid-row:1!important;width:36px!important;height:36px!important;min-width:36px!important;border-radius:12px!important;display:grid!important;place-items:center!important}
    #micBtn::before{content:"";width:9px;height:17px;border:2px solid currentColor;border-radius:7px;box-sizing:border-box}
    #micBtn::after{content:"";position:absolute;width:16px;height:11px;border:2px solid currentColor;border-top:0;border-radius:0 0 10px 10px;bottom:7px;left:50%;transform:translateX(-50%);box-sizing:border-box}
    #micBtn.recording{color:var(--accent,#20a66a)}#micBtn.recording::before{box-shadow:0 0 0 3px color-mix(in srgb,currentColor 12%,transparent)}

    /* Keep the chat list actions clean and consistent. */
    .side-bottom{padding:12px!important}.side-action{width:100%!important;min-height:42px!important;margin:3px 0!important;padding:9px 11px!important;display:flex!important;align-items:center!important;gap:10px!important;border:1px solid transparent!important;border-radius:12px!important;background:transparent!important;color:var(--text)!important;font-size:13px!important;text-align:right!important}
    .side-action:hover{background:var(--surface2)!important;border-color:var(--border)!important}.side-action .nova-action-icon{width:20px;height:20px;flex:none;opacity:.82}.side-action .nova-action-icon svg{width:20px;height:20px;display:block;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .nova-update-btn{font-weight:600!important}.nova-update-icon{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;opacity:.82}.nova-update-icon svg{width:19px;height:19px;display:block;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    /* Restore the familiar support/settings panel proportions. */
    .overlay{background:rgba(3,7,5,.62)!important;backdrop-filter:blur(12px)!important}
    .settings-panel,.support-panel{background:var(--surface)!important;color:var(--text)!important;border-left:1px solid var(--border)!important;box-shadow:-24px 0 70px rgba(0,0,0,.35)!important}
    .support-panel{width:min(680px,100%)!important;height:100%!important;display:flex!important;flex-direction:column!important}
    .support-messages{flex:1!important;overflow:auto!important;padding:18px 22px!important}
    .support-msg{max-width:90%;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--surface2);color:var(--text);margin-bottom:10px;line-height:1.7}
    .support-form{display:flex!important;gap:8px!important;padding:12px 18px calc(12px + env(safe-area-inset-bottom))!important;border-top:1px solid var(--border)!important;background:var(--surface)!important}
    .support-form input{flex:1!important;min-width:0!important;border:1px solid var(--border)!important;background:var(--surface2)!important;color:var(--text)!important;border-radius:12px!important;padding:10px 12px!important;outline:0!important}.support-form .send-btn{flex:0 0 40px!important}

    /* Soft open/close motion without changing the theme. */
    .overlay.nova-smooth{transition:opacity .22s ease,visibility .22s ease!important}.overlay.nova-smooth .settings-panel,.overlay.nova-smooth .support-panel{transform:translateY(10px);opacity:0;transition:transform .24s cubic-bezier(.2,.8,.2,1),opacity .2s ease!important}.overlay.nova-smooth.nova-open .settings-panel,.overlay.nova-smooth.nova-open .support-panel{transform:none;opacity:1}

    .nova-update-overlay{position:fixed!important;inset:0!important;z-index:9999!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(2,5,4,.72)!important;backdrop-filter:blur(16px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s ease,visibility .22s ease}
    .nova-update-overlay.open{opacity:1;visibility:visible;pointer-events:auto}.nova-update-card{width:min(520px,100%);max-height:min(680px,90vh);overflow:auto;background:var(--surface,#151817);color:var(--text,#f5f7f6);border:1px solid var(--border,#2a302d);border-radius:22px;box-shadow:0 30px 100px rgba(0,0,0,.5);padding:24px;transform:translateY(14px) scale(.98);opacity:0;transition:transform .28s ease,opacity .22s ease}.nova-update-overlay.open .nova-update-card{transform:none;opacity:1}
    .nova-update-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.nova-update-head h2{margin:4px 0 0;font-size:21px}.nova-update-close{width:36px;height:36px;border:1px solid var(--border);border-radius:12px;background:var(--surface2);color:var(--text);font-size:22px;cursor:pointer}.nova-update-item{padding:15px 0;border-bottom:1px solid var(--border)}.nova-update-item:last-child{border-bottom:0}.nova-update-item h3{margin:0 0 5px;font-size:15px}.nova-update-item p{margin:0;color:var(--muted,#aab2ad);line-height:1.75;font-size:13px}.nova-update-meta{font-size:11px;color:var(--muted,#8f9892);margin-bottom:6px}.nova-update-more{width:100%;margin-top:16px;height:44px;border:0;border-radius:13px;background:var(--accent,#20a66a);color:#fff;font-weight:700;cursor:pointer}.nova-update-empty{padding:40px;text-align:center;color:var(--muted)}
    .nova-updates-page{position:fixed;inset:0;z-index:9998;background:var(--bg,#0b0d0c);color:var(--text,#f5f7f6);overflow:auto;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .25s ease,transform .28s ease}.nova-updates-page.open{opacity:1;transform:none;pointer-events:auto}.nova-updates-shell{width:min(920px,100%);margin:auto;padding:34px 20px 60px}.nova-updates-top{display:flex;align-items:center;gap:12px;margin-bottom:42px}.nova-updates-back{width:40px;height:40px;border:1px solid var(--border);border-radius:12px;background:var(--surface2);color:var(--text);cursor:pointer;font-size:20px}.nova-updates-title small{color:var(--accent);font-weight:700;letter-spacing:.08em}.nova-updates-title h1{margin:7px 0 0;font-size:clamp(28px,6vw,48px);line-height:1.15}.nova-updates-list{display:grid;gap:14px}.nova-update-full{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px}.nova-update-full h2{margin:0 0 7px;font-size:19px}.nova-update-full .summary{color:var(--text);font-size:14px;line-height:1.8}.nova-update-full .details{color:var(--muted);font-size:13px;line-height:1.9;white-space:pre-wrap;margin-top:10px}.nova-update-badge{display:inline-flex;padding:4px 8px;border-radius:8px;background:color-mix(in srgb,var(--accent,#20a66a) 14%,transparent);color:var(--accent,#20a66a);font-size:11px;margin-left:7px}

    @media(max-width:900px){
      .composer-wrap{left:50%!important;width:calc(100vw - 16px)!important;padding-left:4px!important;padding-right:4px!important}
      .composer{grid-template-columns:34px 34px minmax(0,1fr) 34px 34px!important;gap:6px!important;padding:6px!important}
      .ai-mode-picker,.ai-mode-picker-btn,#attachBtn,#micBtn,#sendBtn{width:34px!important;height:34px!important}#sendBtn{min-width:34px!important}.support-panel{width:100%!important}.nova-updates-shell{padding:24px 15px 45px}
    }
  `;
  document.head.appendChild(css);

  const closeSidebar=()=>{
    qa('#sidebar,.chat-sidebar,.mobile-sidebar,.chat-drawer,[data-sidebar]').forEach(s=>s.classList.remove('open','active','show','visible'));
    qa('#sidebarOverlay,#chatSidebarOverlay,#mobileSidebarOverlay,.sidebar-overlay').forEach(e=>e.classList.add('hidden'));
    document.body.classList.remove('sidebar-open','drawer-open','chat-sidebar-open','menu-open');
  };

  const setupSmoothOverlay=overlay=>{
    if(!overlay||overlay.dataset.novaSmooth)return;
    overlay.dataset.novaSmooth='1';overlay.classList.add('nova-smooth');
    const sync=()=>overlay.classList.toggle('nova-open',!overlay.classList.contains('hidden'));
    new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});sync();
  };
  const openSmooth=overlay=>{if(!overlay)return;overlay.classList.remove('hidden');requestAnimationFrame(()=>overlay.classList.add('nova-open'));};
  const closeSmooth=overlay=>{if(!overlay)return;overlay.classList.remove('nova-open');setTimeout(()=>overlay.classList.add('hidden'),240);};

  function makeUpdatesUI(){
    if(q('#novaUpdateOverlay'))return;
    const pop=document.createElement('div');pop.id='novaUpdateOverlay';pop.className='nova-update-overlay';
    pop.innerHTML=`<section class="nova-update-card" role="dialog" aria-modal="true"><div class="nova-update-head"><div><small style="color:var(--accent)">NOVA UPDATE</small><h2>آپدیت‌های جدید Nova</h2></div><button class="nova-update-close" aria-label="بستن">×</button></div><div class="nova-update-list"></div><button class="nova-update-more">اطلاعات بیشتر</button></section>`;
    document.body.appendChild(pop);
    const page=document.createElement('div');page.id='novaUpdatesPage';page.className='nova-updates-page';page.innerHTML=`<div class="nova-updates-shell"><div class="nova-updates-top"><button class="nova-updates-back" aria-label="بازگشت">‹</button><div class="nova-updates-title"><small>NOVA V5</small><h1>آپدیت های جدید Nova V5</h1></div></div><div class="nova-updates-list"></div></div>`;document.body.appendChild(page);
    on(q('.nova-update-close',pop),'click',()=>pop.classList.remove('open'));on(q('.nova-update-more',pop),'click',()=>{pop.classList.remove('open');openUpdatesPage();});on(q('.nova-updates-back',page),'click',closeUpdatesPage);
    on(document,'keydown',e=>{if(e.key==='Escape'){pop.classList.remove('open');closeUpdatesPage();}});
  }

  let updateCache=[];
  async function loadUpdates(){try{const r=await fetch('/api/updates',{credentials:'include',cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw Error('updates');updateCache=Array.isArray(d.updates)?d.updates:[];renderUpdatePopup();renderUpdatesPage();return updateCache}catch(e){console.warn('Nova updates unavailable',e);return updateCache;}}
  const escUpdate=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function renderUpdatePopup(){const box=q('#novaUpdateOverlay .nova-update-list');if(!box)return;box.innerHTML=updateCache.slice(0,3).map(u=>`<article class="nova-update-item"><div class="nova-update-meta"><span class="nova-update-badge">${escUpdate(u.version||'V5')}</span>${escUpdate(u.date||'')}</div><h3>${escUpdate(u.title)}</h3><p>${escUpdate(u.summary||u.details||'')}</p></article>`).join('')||'<div class="nova-update-empty">فعلاً آپدیت جدیدی ثبت نشده.</div>';}
  function renderUpdatesPage(){const box=q('#novaUpdatesPage .nova-updates-list');if(!box)return;box.innerHTML=updateCache.map(u=>`<article class="nova-update-full"><div class="nova-update-meta"><span class="nova-update-badge">${escUpdate(u.version||'V5')}</span>${escUpdate(u.date||'')}</div><h2>${escUpdate(u.title)}</h2><div class="summary">${escUpdate(u.summary||'')}</div>${u.details?`<div class="details">${escUpdate(u.details)}</div>`:''}</article>`).join('')||'<div class="nova-update-empty">آپدیتی برای نمایش وجود ندارد.</div>';}
  function openUpdatesPage(){makeUpdatesUI();q('#novaUpdatesPage')?.classList.add('open');closeSidebar();loadUpdates();history.pushState({novaUpdates:true},'',location.pathname+'?view=updates');}
  function closeUpdatesPage(){const p=q('#novaUpdatesPage');if(!p)return;p.classList.remove('open');if(new URLSearchParams(location.search).get('view')==='updates')history.back();}
  async function maybeShowUpdate(){makeUpdatesUI();const list=await loadUpdates();if(!list.length)return;const newest=list[0];const seen=localStorage.getItem('nova:lastUpdateSeen');if(seen!==newest.id){q('#novaUpdateOverlay')?.classList.add('open');localStorage.setItem('nova:lastUpdateSeen',newest.id);}}

  function addSidebarUpdateButton(){
    const bottom=q('.side-bottom');if(!bottom||q('#novaUpdatesBtn'))return;
    const b=document.createElement('button');b.id='novaUpdatesBtn';b.className='side-action nova-update-btn';
    b.innerHTML='<span class="nova-update-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3.5h8l3 3V20.5H7z"/><path d="M15 3.5v4h4"/><path d="M10 12h5M10 15h5"/><path d="M12.5 18v-3M10.8 16.5l1.7-1.7 1.7 1.7"/></svg></span><span>آپدیت‌های Nova</span>';
    bottom.insertBefore(b,q('#openSettings')||bottom.firstChild);on(b,'click',()=>{closeSidebar();openUpdatesPage();});
  }

  function wirePanels(){
    const so=q('#settingsOverlay'),po=q('#supportOverlay');setupSmoothOverlay(so);setupSmoothOverlay(po);
    const openSettings=()=>{closeSidebar();try{if(typeof window.openSettings==='function')window.openSettings();else openSmooth(so);}catch(e){console.warn('Nova settings:',e);openSmooth(so);}};
    const topSettings=q('#settingsBtn'),sideSettings=q('#openSettings');
    if(sideSettings&&!sideSettings.dataset.novaPanel){sideSettings.dataset.novaPanel='1';on(sideSettings,'click',openSettings,true)}
    if(topSettings&&!topSettings.dataset.novaPanel){topSettings.dataset.novaPanel='1';on(topSettings,'click',openSettings,true)}
    const sb=q('#supportBtn');if(sb&&!sb.dataset.novaPanel){sb.dataset.novaPanel='1';on(sb,'click',()=>{closeSidebar();closeSmooth(so);openSmooth(po);},true)}
    const cs=q('#closeSettings');if(cs&&!cs.dataset.novaPanel){cs.dataset.novaPanel='1';on(cs,'click',()=>closeSmooth(so),true)}
    const cp=q('#closeSupport');if(cp&&!cp.dataset.novaPanel){cp.dataset.novaPanel='1';on(cp,'click',()=>closeSmooth(po),true)}
  }

  function preventDoubleSend(){const send=q('#sendBtn');if(!send||send.dataset.novaGuard)return;send.dataset.novaGuard='1';on(send,'click',e=>{if(send.dataset.busy==='1'){e.preventDefault();e.stopImmediatePropagation();return}send.dataset.busy='1';setTimeout(()=>send.dataset.busy='0',1200)},true)}
  function guardModelPicker(){const picker=q('.ai-mode-picker'),menu=q('.ai-mode-menu');if(!picker||!menu||picker.dataset.novaPicker)return;picker.dataset.novaPicker='1';on(document,'click',e=>{if(!picker.contains(e.target))menu.classList.remove('open');});}

  function observeApp(){
    const app=q('#app');if(!app)return;
    const ready=()=>{if(!app.classList.contains('hidden')){addSidebarUpdateButton();wirePanels();preventDoubleSend();guardModelPicker();maybeShowUpdate();}};
    ready();new MutationObserver(ready).observe(app,{attributes:true,attributeFilter:['class']});
  }
  on(window,'popstate',()=>{if(new URLSearchParams(location.search).get('view')==='updates'){makeUpdatesUI();q('#novaUpdatesPage')?.classList.add('open');loadUpdates();}else q('#novaUpdatesPage')?.classList.remove('open');});
  on(document,'DOMContentLoaded',()=>{makeUpdatesUI();observeApp();if(new URLSearchParams(location.search).get('view')==='updates')openUpdatesPage();});
})();
