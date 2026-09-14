(() => {
  'use strict';

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // V5: keep the existing dark theme untouched; this layer only normalizes layout/UX.
  const style = document.createElement('style');
  style.textContent = `
    /* ===== Nova V5 workspace ===== */
    .nova-v5-suggestions,.suggestions,.suggestion-grid,.prompt-suggestions,.quick-prompts,
    .home-suggestions,.welcome-suggestions,[class*="suggestion"] { display:none !important; }

    .composer-wrap { left:calc(50% + 135px) !important; width:min(820px,calc(100vw - 302px)) !important; transform:translateX(-50%) !important; }
    .composer { display:flex !important; align-items:center !important; gap:8px !important; box-sizing:border-box !important; }
    .composer > * { flex:0 0 auto; }
    .composer textarea,.composer input { min-width:0 !important; }

    .ai-mode-picker { width:38px !important; height:36px !important; flex:0 0 38px !important; position:relative !important; }
    .ai-mode-picker-btn { width:38px !important; height:36px !important; padding:0 !important; display:flex !important; align-items:center !important; justify-content:center !important; }
    .ai-mode-picker-btn span:first-child { display:none !important; }
    .ai-mode-picker-btn span:last-child { margin:0 !important; font-size:18px !important; line-height:1 !important; }
    .ai-mode-menu { display:none !important; position:absolute !important; bottom:calc(100% + 8px) !important; left:0 !important; z-index:100 !important; }
    .ai-mode-menu.open { display:block !important; }

    #webBtn,#imageBtn,.web-search-btn,.image-prompt-btn,.prompt-btn { display:none !important; }

    #micBtn { width:36px !important; height:36px !important; flex:0 0 36px !important; position:relative !important; display:flex !important; align-items:center !important; justify-content:center !important; font-size:0 !important; }
    #micBtn::before { content:""; width:9px; height:17px; border:2px solid currentColor; border-radius:7px; box-sizing:border-box; }
    #micBtn::after { content:""; position:absolute; width:16px; height:11px; border:2px solid currentColor; border-top:0; border-radius:0 0 10px 10px; bottom:8px; left:50%; transform:translateX(-50%); box-sizing:border-box; }
    #micBtn.recording { color:var(--accent,#20a66a); }
    #micBtn.recording::before { box-shadow:0 0 0 3px color-mix(in srgb,currentColor 12%,transparent); }

    .topbar,.top-bar { min-height:52px !important; }
    .topbar button,.top-bar button { display:inline-flex !important; align-items:center !important; justify-content:center !important; }
    .sidebar,.chat-sidebar { contain:layout paint; }
    .chat-list { overflow-anchor:auto; }

    @media (max-width:900px) {
      .composer-wrap { left:50% !important; width:calc(100vw - 24px) !important; }
      .composer { gap:6px !important; }
      #micBtn { width:34px !important; height:34px !important; flex-basis:34px !important; }
      .ai-mode-picker,.ai-mode-picker-btn { width:34px !important; height:34px !important; }
    }
  `;
  document.head.appendChild(style);

  function getUserName() {
    const candidates = [
      window.currentUser?.username,
      window.currentUser?.name,
      window.user?.username,
      window.user?.name,
      q('[data-username]')?.dataset.username,
      q('.user-name')?.textContent,
      q('.profile-name')?.textContent
    ];
    const value = candidates.find(v => v && String(v).trim() && !['کاربر','User'].includes(String(v).trim()));
    return value ? String(value).trim() : 'there';
  }

  function cleanHome() {
    qa('button,a,div').forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (!text || text.length > 80) return;
      if (/^(web search|image|prompt|پرامپت|جستجو|جستجوی وب|ساخت تصویر)$/.test(text)) {
        el.style.setProperty('display','none','important');
      }
    });

    const heading = qa('h1,h2,h3,.welcome-title,.welcome-heading,.hero-title').find(el => {
      const t=(el.textContent||'').trim().toLowerCase();
      return /welcome|خوش آمد|سلام|nova/.test(t) || el.classList.contains('welcome-title');
    });
    if (heading) heading.textContent = `Welcome to Nova AI, ${getUserName()}`;
  }

  function normalizePicker() {
    const picker = q('.ai-mode-picker');
    const menu = q('.ai-mode-menu');
    if (!picker || !menu || picker.dataset.v5Bound) return;
    picker.dataset.v5Bound = '1';
    on(picker, 'click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const open = menu.classList.contains('open');
      menu.classList.toggle('open', !open);
      menu.classList.remove('hidden');
    }, true);
    on(document, 'click', e => {
      if (!picker.contains(e.target)) menu.classList.remove('open');
    }, true);
    qa('[data-ai-mode]', menu).forEach(btn => on(btn,'click',e => {
      e.preventDefault(); e.stopPropagation();
      if (typeof window.setAIMode === 'function') window.setAIMode(btn.dataset.aiMode);
      menu.classList.remove('open');
    }));
  }

  function normalizeButtons() {
    const composer = q('.composer');
    if (!composer) return;
    const controls = qa('button', composer).filter(b => b.offsetParent !== null && getComputedStyle(b).display !== 'none');
    controls.forEach(b => {
      b.style.setProperty('align-self','center','important');
      b.style.setProperty('margin-top','0','important');
      b.style.setProperty('margin-bottom','0','important');
    });
  }

  function stabilizeScroll() {
    const area = q('.chat-list,.messages,.chat-messages,.conversation');
    if (!area || area.dataset.v5Scroll) return;
    area.dataset.v5Scroll='1';
    let raf=0;
    on(area,'scroll',()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>area.style.scrollBehavior='auto');
    },{passive:true});
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

  function run() {
    cleanHome();
    normalizePicker();
    normalizeButtons();
    stabilizeScroll();
    preventDoubleSend();
  }

  let scheduled=false;
  const schedule=()=>{ if(scheduled)return; scheduled=true; requestAnimationFrame(()=>{scheduled=false;run();}); };
  on(document,'DOMContentLoaded',run);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  run();
})();
