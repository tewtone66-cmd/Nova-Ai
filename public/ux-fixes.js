(() => {
  'use strict';

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // V5.1: layout-only polish. Keep the existing theme and application logic intact.
  const style = document.createElement('style');
  style.textContent = `
    /* ===== home / welcome cleanup ===== */
    .quick-grid,
    .nova-v5-suggestions,
    .suggestions,
    .suggestion-grid,
    .prompt-suggestions,
    .quick-prompts,
    .home-suggestions,
    .welcome-suggestions { display:none !important; }

    /* ===== remove the Android blue tap flash / accidental focus glow ===== */
    button,a,input,textarea,select,label { -webkit-tap-highlight-color:transparent !important; }
    button:focus,button:focus-visible,a:focus,a:focus-visible { outline:none !important; }

    /* ===== mobile composer: fixed, symmetric five-slot layout ===== */
    .composer-wrap {
      left:50% !important;
      right:auto !important;
      width:min(900px,calc(100vw - 24px)) !important;
      transform:translateX(-50%) !important;
    }
    .composer {
      width:100% !important;
      max-width:none !important;
      min-height:52px !important;
      display:grid !important;
      grid-template-columns:38px 38px minmax(0,1fr) 38px 38px !important;
      grid-template-areas:"mode attach input mic send" !important;
      align-items:center !important;
      gap:8px !important;
      padding:7px !important;
      direction:ltr !important;
    }
    .ai-mode-picker { grid-area:mode !important; width:38px !important; height:38px !important; position:relative !important; }
    .ai-mode-picker-btn { width:38px !important; height:38px !important; padding:0 !important; display:grid !important; place-items:center !important; }
    .ai-mode-picker-btn span:first-child { display:none !important; }
    .ai-mode-picker-btn span:last-child { margin:0 !important; font-size:17px !important; line-height:1 !important; }
    .ai-mode-menu { display:none !important; position:absolute !important; bottom:calc(100% + 8px) !important; left:0 !important; z-index:300 !important; }
    .ai-mode-menu.open { display:block !important; }

    #attachBtn { grid-area:attach !important; }
    #micBtn { grid-area:mic !important; width:38px !important; height:38px !important; flex:none !important; position:relative !important; display:grid !important; place-items:center !important; font-size:0 !important; }
    #sendBtn { width:38px !important; height:38px !important; flex:none !important; }
    .composer-tools { display:contents !important; }
    .composer-tools #webBtn,.composer-tools #imageBtn,
    #webBtn,#imageBtn,.web-search-btn,.image-prompt-btn,.prompt-btn { display:none !important; }
    .composer textarea,
    .composer input { grid-area:input !important; width:100% !important; min-width:0 !important; margin:0 !important; direction:rtl !important; text-align:right !important; align-self:stretch !important; }

    /* clean microphone icon without emoji rendering differences */
    #micBtn::before { content:""; width:9px; height:17px; border:2px solid currentColor; border-radius:7px; box-sizing:border-box; }
    #micBtn::after { content:""; position:absolute; width:16px; height:11px; border:2px solid currentColor; border-top:0; border-radius:0 0 10px 10px; bottom:8px; left:50%; transform:translateX(-50%); box-sizing:border-box; }
    #micBtn.recording { color:var(--accent,#20a66a); }
    #micBtn.recording::before { box-shadow:0 0 0 3px color-mix(in srgb,currentColor 12%,transparent); }

    /* ===== top bar ===== */
    .topbar,.top-bar { min-height:56px !important; }
    .topbar button,.top-bar button { display:inline-flex !important; align-items:center !important; justify-content:center !important; }
    .topbar .icon-btn { -webkit-tap-highlight-color:transparent !important; }

    /* ===== sidebar / settings / support ===== */
    .sidebar,.chat-sidebar { contain:layout paint; }
    .side-action { display:flex !important; align-items:center !important; gap:10px !important; min-height:42px !important; border-radius:12px !important; transition:background 180ms ease,transform 180ms ease !important; }
    .side-action:active { transform:scale(.98) !important; }
    .nova-side-icon { width:28px; height:28px; display:grid; place-items:center; flex:0 0 28px; border-radius:9px; color:var(--accent); background:color-mix(in srgb,var(--accent) 11%,transparent); font-size:16px; font-weight:700; }
    .overlay { background:rgba(0,0,0,.58) !important; }
    .settings-panel,.support-panel { background:var(--surface) !important; color:var(--text) !important; border:1px solid var(--border) !important; box-shadow:0 24px 80px rgba(0,0,0,.38) !important; }
    .support-panel { width:min(520px,100%) !important; height:min(760px,100%) !important; margin:auto !important; border-radius:22px !important; overflow:hidden !important; display:flex !important; flex-direction:column !important; }
    .support-messages { background:var(--bg) !important; }
    .support-msg { border:1px solid var(--border) !important; background:var(--surface2) !important; color:var(--text) !important; }
    .support-form { background:var(--surface) !important; border-top:1px solid var(--border) !important; }
    .support-form input { background:var(--surface2) !important; color:var(--text) !important; border:1px solid var(--border) !important; outline:none !important; }

    /* ===== scroll / performance ===== */
    .chat-list { overflow-anchor:auto; }
    .chat-view { overscroll-behavior:contain; }

    @media (max-width:900px) {
      .composer-wrap { width:calc(100vw - 24px) !important; }
      .composer { grid-template-columns:34px 34px minmax(0,1fr) 34px 34px !important; gap:6px !important; min-height:50px !important; }
      .ai-mode-picker,.ai-mode-picker-btn,#attachBtn,#micBtn,#sendBtn { width:34px !important; height:34px !important; }
      #micBtn::after { bottom:6px; }
      .support-panel { width:calc(100% - 20px) !important; height:min(760px,calc(100% - 20px)) !important; border-radius:20px !important; }
    }
  `;
  document.head.appendChild(style);

  function getUserName() {
    const visible = q('#userName')?.textContent?.trim();
    if (visible && !['کاربر', 'User'].includes(visible)) return visible;
    const candidates = [
      window.currentUser?.username,
      window.currentUser?.name,
      window.user?.username,
      window.user?.name,
      q('[data-username]')?.dataset.username
    ];
    const value = candidates.find(v => v && String(v).trim());
    return value ? String(value).trim() : 'کاربر';
  }

  function cleanHome() {
    const welcome = q('#welcome');
    if (!welcome) return;
    const heading = q('h1', welcome);
    if (heading) {
      const name = getUserName();
      heading.textContent = `Welcome to Nova AI, ${name}`;
    }
  }

  function normalizeModePicker() {
    const picker = q('.ai-mode-picker');
    const menu = q('.ai-mode-menu');
    if (!picker || !menu || picker.dataset.v51Bound) return;
    picker.dataset.v51Bound = '1';
    on(picker, 'click', e => {
      const button = e.target.closest('#aiModePickerBtn');
      if (!button) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      menu.classList.toggle('open');
      menu.classList.remove('hidden');
    }, true);
    on(document, 'click', e => {
      if (!picker.contains(e.target)) menu.classList.remove('open');
    }, true);
  }

  function normalizeComposer() {
    const composer = q('.composer');
    if (!composer) return;
    qa('button', composer).forEach(button => {
      button.style.setProperty('align-self','center','important');
      button.style.setProperty('margin','0','important');
    });
  }

  function bindOverlayFallback(id, openId, closeId) {
    const overlay = q('#' + id);
    const openers = qa('#' + openId + (openId === 'openSettings' ? ',#settingsBtn' : ''));
    const closer = q('#' + closeId);
    if (!overlay || overlay.dataset.v51Bound) return;
    overlay.dataset.v51Bound = '1';

    openers.forEach(button => on(button, 'click', () => {
      // Existing app logic gets first chance. If it did not open the panel,
      // this fallback makes the control reliable instead of toggling twice.
      setTimeout(() => overlay.classList.remove('hidden'), 0);
    }));
    on(closer, 'click', () => overlay.classList.add('hidden'));
    on(overlay, 'click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  }

  function bindSidebarFallback() {
    const sidebar = q('#sidebar');
    const open = q('#openSide');
    const close = q('#closeSide');
    if (!sidebar) return;
    on(open, 'click', () => setTimeout(() => sidebar.classList.add('open'), 0));
    on(close, 'click', () => sidebar.classList.remove('open'));
  }

  function polishSideIcons() {
    const settings = q('#openSettings');
    const support = q('#supportBtn');
    if (settings && !settings.dataset.v51Icon) {
      settings.dataset.v51Icon = '1';
      settings.innerHTML = '<span class="nova-side-icon">⚙</span><span>تنظیمات</span>';
    }
    if (support && !support.dataset.v51Icon) {
      support.dataset.v51Icon = '1';
      support.innerHTML = '<span class="nova-side-icon">✦</span><span>پشتیبانی</span>';
    }
  }

  function stabilizeScroll() {
    const area = q('#chatView');
    if (!area || area.dataset.v51Scroll) return;
    area.dataset.v51Scroll = '1';
    on(area, 'scroll', () => { area.style.scrollBehavior = 'auto'; }, {passive:true});
  }

  function preventDoubleSend() {
    const send = q('#sendBtn');
    if (!send || send.dataset.v51Bound) return;
    send.dataset.v51Bound = '1';
    on(send, 'click', e => {
      if (send.dataset.v51Busy === '1') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      send.dataset.v51Busy = '1';
      setTimeout(() => { send.dataset.v51Busy = '0'; }, 900);
    }, true);
  }

  function run() {
    cleanHome();
    normalizeModePicker();
    normalizeComposer();
    polishSideIcons();
    bindOverlayFallback('settingsOverlay', 'openSettings', 'closeSettings');
    bindOverlayFallback('supportOverlay', 'supportBtn', 'closeSupport');
    bindSidebarFallback();
    stabilizeScroll();
    preventDoubleSend();
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; run(); });
  };

  on(document, 'DOMContentLoaded', run);

  // Observe only the small dynamic UI regions instead of the entire body.
  // This avoids the V5.0 full-DOM MutationObserver scan that could cause lag.
  const observeTargets = () => {
    ['#welcome','#composerWrap','#sidebar','.topbar'].forEach(sel => {
      const node = q(sel);
      if (!node || node.dataset.v51Observed) return;
      node.dataset.v51Observed = '1';
      new MutationObserver(schedule).observe(node, {childList:true,subtree:true});
    });
  };
  on(document, 'DOMContentLoaded', observeTargets);
  run();
  observeTargets();
})();
