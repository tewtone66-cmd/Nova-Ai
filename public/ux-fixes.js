(() => {
  'use strict';

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const style = document.createElement('style');
  style.textContent = `
    /* No Android/Chrome blue tap flash. Keep keyboard focus visible. */
    *, *::before, *::after { -webkit-tap-highlight-color: transparent !important; tap-highlight-color: transparent !important; }
    button, a, input, textarea { -webkit-tap-highlight-color: transparent !important; }
    button:focus { outline: none !important; }
    button:focus-visible { outline: 2px solid color-mix(in srgb,var(--accent,#20a66a) 55%,transparent) !important; outline-offset: 2px; }

    /* Main welcome cleanup: the six shortcut cards are intentionally gone. */
    #welcome .quick-grid,
    .quick-grid,
    .nova-v5-suggestions,.suggestions,.suggestion-grid,.prompt-suggestions,.quick-prompts,
    .home-suggestions,.welcome-suggestions,[class*="suggestion"] { display:none !important; }

    /* Composer: one clean, symmetric five-slot row. */
    .composer-wrap {
      left:calc(50% + 135px) !important;
      width:min(900px,calc(100vw - 312px)) !important;
      transform:translateX(-50%) !important;
      padding-left:14px !important;
      padding-right:14px !important;
    }
    .composer {
      width:100% !important;
      max-width:none !important;
      display:grid !important;
      grid-template-columns:36px 36px minmax(0,1fr) 36px 36px !important;
      grid-template-rows:minmax(36px,auto) !important;
      align-items:center !important;
      gap:8px !important;
      direction:ltr !important;
      padding:7px !important;
      box-sizing:border-box !important;
    }
    .composer > * { min-width:0; margin:0 !important; }
    .ai-mode-picker { grid-column:1 !important; grid-row:1 !important; width:36px !important; height:36px !important; position:relative !important; }
    .ai-mode-picker-btn { width:36px !important; height:36px !important; padding:0 !important; display:flex !important; align-items:center !important; justify-content:center !important; border-radius:12px !important; }
    .ai-mode-picker-btn span:first-child { display:none !important; }
    .ai-mode-picker-btn span:last-child { margin:0 !important; font-size:18px !important; line-height:1 !important; }
    .ai-mode-menu { display:none !important; position:absolute !important; bottom:calc(100% + 8px) !important; left:0 !important; z-index:100 !important; }
    .ai-mode-menu.open { display:block !important; }

    #attachBtn { grid-column:2 !important; grid-row:1 !important; width:36px !important; height:36px !important; }
    #composer { grid-column:3 !important; grid-row:1 !important; width:100% !important; min-width:0 !important; direction:rtl !important; text-align:right !important; align-self:center !important; }
    #micBtn { grid-column:4 !important; grid-row:1 !important; width:36px !important; height:36px !important; position:relative !important; display:flex !important; align-items:center !important; justify-content:center !important; font-size:0 !important; }
    .composer-tools { display:contents !important; }
    #webBtn,#imageBtn,.web-search-btn,.image-prompt-btn,.prompt-btn { display:none !important; }
    #sendBtn { grid-column:5 !important; grid-row:1 !important; width:36px !important; height:36px !important; min-width:36px !important; border-radius:12px !important; display:grid !important; place-items:center !important; }

    /* Draw a stable monochrome microphone instead of relying on emoji rendering. */
    #micBtn::before { content:""; width:9px; height:17px; border:2px solid currentColor; border-radius:7px; box-sizing:border-box; }
    #micBtn::after { content:""; position:absolute; width:16px; height:11px; border:2px solid currentColor; border-top:0; border-radius:0 0 10px 10px; bottom:7px; left:50%; transform:translateX(-50%); box-sizing:border-box; }
    #micBtn.recording { color:var(--accent,#20a66a); }
    #micBtn.recording::before { box-shadow:0 0 0 3px color-mix(in srgb,currentColor 12%,transparent); }

    /* Sidebar actions: compact premium controls with clean monochrome icons. */
    .side-bottom { padding:12px !important; }
    .side-action {
      width:100% !important;
      min-height:42px !important;
      margin:3px 0 !important;
      padding:9px 11px !important;
      display:flex !important;
      align-items:center !important;
      gap:10px !important;
      border:1px solid transparent !important;
      border-radius:12px !important;
      background:transparent !important;
      color:var(--text) !important;
      font-size:13px !important;
      text-align:right !important;
    }
    .side-action:hover { background:var(--surface2) !important; border-color:var(--border) !important; }
    .side-action .nova-action-icon { width:20px; height:20px; flex:none; opacity:.82; }
    .side-action .nova-action-icon svg { width:20px; height:20px; display:block; stroke:currentColor; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }

    /* Settings / support panels: restore the intended dark premium surface. */
    .overlay { background:rgba(3,7,5,.62) !important; backdrop-filter:blur(12px) !important; }
    .settings-panel,.support-panel {
      background:var(--surface) !important;
      color:var(--text) !important;
      border-left:1px solid var(--border) !important;
      box-shadow:-24px 0 70px rgba(0,0,0,.35) !important;
    }
    .support-panel { width:min(680px,100%) !important; height:100% !important; display:flex !important; flex-direction:column !important; }
    .support-messages { flex:1 !important; overflow:auto !important; padding:18px 22px !important; }
    .support-msg { max-width:90%; padding:12px 14px; border:1px solid var(--border); border-radius:14px; background:var(--surface2); color:var(--text); margin-bottom:10px; line-height:1.7; }
    .support-form { display:flex !important; gap:8px !important; padding:12px 18px calc(12px + env(safe-area-inset-bottom)) !important; border-top:1px solid var(--border) !important; background:var(--surface) !important; }
    .support-form input { flex:1 !important; min-width:0 !important; border:1px solid var(--border) !important; background:var(--surface2) !important; color:var(--text) !important; border-radius:12px !important; padding:10px 12px !important; outline:0 !important; }
    .support-form .send-btn { flex:0 0 40px !important; }

    .topbar,.top-bar { min-height:52px !important; }
    .topbar button,.top-bar button { display:inline-flex !important; align-items:center !important; justify-content:center !important; }
    .sidebar,.chat-sidebar { contain:layout paint; }
    .chat-list { overflow-anchor:auto; }

    @media (max-width:900px) {
      .composer-wrap { left:50% !important; width:calc(100vw - 16px) !important; padding-left:4px !important; padding-right:4px !important; }
      .composer { grid-template-columns:34px 34px minmax(0,1fr) 34px 34px !important; gap:6px !important; padding:6px !important; }
      .ai-mode-picker,.ai-mode-picker-btn,#attachBtn,#micBtn,#sendBtn { width:34px !important; height:34px !important; }
      #sendBtn { min-width:34px !important; }
      .support-panel { width:100% !important; }
    }
  `;
  document.head.appendChild(style);

  function getUserName() {
    const candidates = [
      q('#userName')?.textContent,
      window.currentUser?.username,
      window.currentUser?.name,
      window.user?.username,
      window.user?.name,
      q('[data-username]')?.dataset.username,
      q('.profile-name')?.textContent
    ];
    const value = candidates.find(v => v && String(v).trim() && !['کاربر','User','there'].includes(String(v).trim()));
    return value ? String(value).trim() : 'کاربر';
  }

  function cleanHome() {
    const welcome = q('#welcome');
    if (!welcome) return;
    qa('button,a', welcome).forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (/^(web search|image|prompt|پرامپت|جستجو|جستجوی وب|ساخت تصویر)$/.test(text)) {
        el.style.setProperty('display','none','important');
      }
    });
    const heading = qa('h1,h2,h3,.welcome-title,.welcome-heading,.hero-title', welcome).find(el => {
      const t=(el.textContent||'').trim().toLowerCase();
      return /welcome|خوش آمد|سلام|nova/.test(t) || el.classList.contains('welcome-title');
    });
    if (heading) heading.textContent = `Welcome to Nova AI, ${getUserName()}`;
  }

  function installIcons() {
    const settings = q('#openSettings');
    const support = q('#supportBtn');
    const topSettings = q('#settingsBtn');
    const icon = (name) => {
      const common = 'class="nova-action-icon" aria-hidden="true"';
      if (name === 'settings') return `<span ${common}><svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 0 1-4 0v-.1a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 12H2a2 2 0 0 1 0-4h-.4a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A2 2 0 0 0 9.2 3V2.9a2 2 0 0 1 4 0V3a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1A2 2 0 0 0 20.8 11h.4a2 2 0 0 1 0 4h-.4a2 2 0 0 0-1.4 0Z"/></svg></span>`;
      return `<span ${common}><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-4.1A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8.5 10.5h7M8.5 13.5h5"/></svg></span>`;
    };
    if (settings && !settings.querySelector('.nova-action-icon')) settings.insertAdjacentHTML('afterbegin', icon('settings'));
    if (support && !support.querySelector('.nova-action-icon')) support.insertAdjacentHTML('afterbegin', icon('support'));
    if (topSettings && !topSettings.querySelector('svg')) topSettings.innerHTML = icon('settings');
  }

  function wirePanels() {
    const settingsBtn = q('#openSettings');
    const topSettings = q('#settingsBtn');
    const closeSettings = q('#closeSettings');
    const supportBtn = q('#supportBtn');
    const closeSupport = q('#closeSupport');
    const settingsOverlay = q('#settingsOverlay');
    const supportOverlay = q('#supportOverlay');

    const openSettingsSafe = () => {
      try { if (typeof window.openSettings === 'function') window.openSettings(); else settingsOverlay?.classList.remove('hidden'); }
      catch (e) { console.warn('Nova settings panel:', e); settingsOverlay?.classList.remove('hidden'); }
    };
    settingsBtn && (settingsBtn.onclick = openSettingsSafe);
    topSettings && (topSettings.onclick = openSettingsSafe);
    closeSettings && (closeSettings.onclick = () => settingsOverlay?.classList.add('hidden'));
    supportBtn && (supportBtn.onclick = () => supportOverlay?.classList.remove('hidden'));
    closeSupport && (closeSupport.onclick = () => supportOverlay?.classList.add('hidden'));

    const form = q('#supportForm');
    const input = q('#supportInput');
    const messages = q('#supportMessages');
    if (form && !form.dataset.v5Bound) {
      form.dataset.v5Bound='1';
      form.onsubmit = e => {
        e.preventDefault();
        const text=(input?.value||'').trim();
        if(!text) return;
        const user=document.createElement('div');
        user.className='support-msg';
        user.textContent=text;
        messages?.appendChild(user);
        if(input) input.value='';
        const bot=document.createElement('div');
        bot.className='support-msg support-bot';
        bot.innerHTML='<b>پشتیبانی Nova</b><div>پیامت دریافت شد. این بخش فعلاً آزمایشی است.</div>';
        messages?.appendChild(bot);
        messages?.scrollTo({top:messages.scrollHeight,behavior:'smooth'});
      };
    }
  }

  function normalizePicker() {
    const picker = q('.ai-mode-picker');
    const menu = q('.ai-mode-menu');
    if (!picker || !menu || picker.dataset.v5Bound) return;
    picker.dataset.v5Bound = '1';
    on(picker, 'click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      menu.classList.toggle('open');
      menu.classList.remove('hidden');
    }, true);
    on(document, 'click', e => { if (!picker.contains(e.target)) menu.classList.remove('open'); }, true);
  }

  function normalizeButtons() {
    const composer = q('.composer');
    if (!composer) return;
    qa('button', composer).forEach(b => {
      b.style.setProperty('align-self','center','important');
      b.style.setProperty('margin-top','0','important');
      b.style.setProperty('margin-bottom','0','important');
    });
  }

  function stabilizeScroll() {
    const area = q('#chatView,.chat-list,.messages,.chat-messages,.conversation');
    if (!area || area.dataset.v5Scroll) return;
    area.dataset.v5Scroll='1';
    on(area,'scroll',()=>{ area.style.scrollBehavior='auto'; },{passive:true});
  }

  function preventDoubleSend() {
    const send = q('#sendBtn,.send-btn,[data-action="send"]');
    if (!send || send.dataset.v5Bound) return;
    send.dataset.v5Bound='1';
    on(send,'click',e=>{
      if (send.dataset.v5Busy==='1') { e.preventDefault(); e.stopImmediatePropagation(); return; }
      send.dataset.v5Busy='1';
      setTimeout(()=>{ send.dataset.v5Busy='0'; },1200);
    },true);
  }

  function guardAccountAppearance() {
    if (typeof window.applyAppearance !== 'function' || window.applyAppearance.__novaV5Guard) return;
    const original = window.applyAppearance;
    const guarded = function(...args) {
      try { return original.apply(this, args); }
      catch (err) {
        console.warn('Nova: optional appearance element missing:', err);
        const s = window.state?.settings;
        if (!s) return;
        const setText=(id,v)=>{const e=q('#'+id);if(e)e.textContent=v;};
        const setHtml=(id,v)=>{const e=q('#'+id);if(e)e.innerHTML=v;};
        setText('brandName',s.novaName||'Nova');
        setText('mobileName',s.novaName||'Nova');
        setText('heroName',s.novaName||'Nova');
        setText('userName',s.userName||'کاربر');
        setText('statusText',s.novaEnabled?'Nova ON':'Nova OFF');
        setText('limitText',(window.state?.usage?.percent ?? 100)+'%');
        ['brandAvatar','mobileAvatar','heroAvatar','userAvatar'].forEach(id=>{if(q('#'+id)) setHtml(id,q('#'+id).textContent||'N');});
      }
    };
    guarded.__novaV5Guard = true;
    window.applyAppearance = guarded;
  }

  function run() {
    guardAccountAppearance();
    cleanHome();
    installIcons();
    wirePanels();
    normalizePicker();
    normalizeButtons();
    stabilizeScroll();
    preventDoubleSend();
  }

  let scheduled=false;
  const schedule=()=>{ if(scheduled)return; scheduled=true; requestAnimationFrame(()=>{scheduled=false;run();}); };
  on(document,'DOMContentLoaded',run);
  const observer = new MutationObserver(schedule);
  const root = document.body || document.documentElement;
  if (root) observer.observe(root,{childList:true,subtree:true});
  run();
})();
