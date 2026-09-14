(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const root=document.documentElement;

  // Keep the main workspace calm and avoid expensive visual effects.
  const applyPerf=()=>{
    document.body.classList.add('nova-v2');
    const view=$('#chatView');
    if(view){view.style.scrollBehavior='auto';}
  };
  applyPerf();

  // Close mobile sidebar when tapping outside it; avoid global reflows.
  document.addEventListener('click',e=>{
    const side=$('#sidebar');
    if(!side||!side.classList.contains('open'))return;
    if(e.target.closest('#sidebar,#openSide'))return;
    side.classList.remove('open');
  },{passive:true});

  // Prevent accidental repeated submit events while a request is visibly active.
  document.addEventListener('click',e=>{
    const b=e.target.closest('#sendBtn');
    if(!b)return;
    if(b.dataset.busy==='1'){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if(b.title==='توقف تولید')return;
    b.dataset.busy='1';
    window.setTimeout(()=>{if(b.title!=='توقف تولید')b.dataset.busy='0';},250);
  },true);

  // If a request finishes or fails, the existing app changes the send title.
  const send=$('#sendBtn');
  if(send){
    new MutationObserver(()=>{
      if(send.title!=='توقف تولید')send.dataset.busy='0';
    }).observe(send,{attributes:true,attributeFilter:['title']});
  }

  // Keep scrolling stable: only follow the bottom when the user is already near it.
  const view=$('#chatView');
  if(view){
    let nearBottom=true;
    view.addEventListener('scroll',()=>{
      nearBottom=view.scrollHeight-view.scrollTop-view.clientHeight<90;
    },{passive:true});
    window.__novaNearBottom=()=>nearBottom;
  }

  // Make unexpected mode failures understandable without changing API behavior.
  window.addEventListener('error',e=>{
    const label=$('#aiModeLabel')?.textContent||'ChatBot';
    if(!e?.message)return;
    const map={
      'Image Creator':'خطا در ساخت تصویر؛ سرویس تصویر پاسخ نداد. دوباره تلاش کن.',
      'Codex':'خطا در حالت کدنویسی؛ مدل کدنویسی پاسخ نداد. دوباره تلاش کن.',
      'Video':'خطا در ساخت ویدیو؛ سرویس ویدیو پاسخ نداد. دوباره تلاش کن.'
    };
    const msg=map[label];
    if(msg&&typeof window.toast==='function')window.toast(msg);
  });

  // Use the requested premium visual language while preserving Settings/theme behavior.
  const style=document.createElement('style');
  style.textContent=`
    body.nova-v2 .quick-grid button{content-visibility:auto;contain:layout paint}
    body.nova-v2 .chat-list{contain:strict}
    body.nova-v2 .messages{contain:layout style}
    body.nova-v2 .message{contain:layout paint}
    body.nova-v2 .chat-view{overscroll-behavior:contain}
    body.nova-v2 .sidebar{will-change:transform}
    body.nova-v2 .settings-panel{will-change:transform}
    body.nova-v2 .composer{contain:layout paint}
    body.nova-v2 .quick-grid button:focus-visible,body.nova-v2 button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    @media(max-width:800px){body.nova-v2 .sidebar{will-change:transform}body.nova-v2 .chat-view{scrollbar-gutter:stable}}
  `;
  document.head.appendChild(style);
})();