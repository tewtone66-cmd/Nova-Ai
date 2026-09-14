(() => {
  'use strict';
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];

  const css=document.createElement('style');
  css.textContent=`
    .composer-wrap,.composer,.composer button,.composer textarea,.composer .ai-mode-picker{pointer-events:auto!important}
    .composer{touch-action:manipulation!important}
    #composer{touch-action:manipulation!important}
    .composer-note{pointer-events:none!important}
    .chat-item .rename{width:30px!important;height:30px!important;min-width:30px!important;padding:0!important;display:grid!important;place-items:center!important;border:1px solid var(--border)!important;border-radius:9px!important;background:transparent!important;color:var(--muted,var(--text))!important;font-size:0!important;line-height:1!important;cursor:pointer!important}
    .chat-item .rename::before{content:'✎';font-size:15px!important;line-height:1!important}
    .chat-item .rename:hover{background:var(--surface2)!important;color:var(--text)!important}
    #sendBtn{touch-action:manipulation!important;-webkit-user-select:none!important;user-select:none!important}
  `;
  document.head.appendChild(css);

  // Prevent the composer from feeling dead after a touch/double-tap. The old
  // guard blocked the button for 1.2s even when no request was running.
  const send=q('#sendBtn');
  if(send && !send.dataset.novaFastGuard){
    send.dataset.novaFastGuard='1';
    let last=0;
    send.addEventListener('click',e=>{
      const now=Date.now();
      if(now-last<260){e.preventDefault();e.stopImmediatePropagation();return;}
      last=now;
    },true);
  }

  // Replace the expensive full-message rebuild during streaming with a small
  // DOM patch. Initial/final renders still use Nova's existing renderer.
  if(typeof renderMessages==='function' && !window.__novaStreamingPatch){
    window.__novaStreamingPatch=true;
    const originalRenderMessages=renderMessages;
    window.renderMessages=function(animate=true){
      if(!animate && state.current && state.current.messages?.length){
        const last=state.current.messages[state.current.messages.length-1];
        if(last?.role==='assistant'){
          const rows=qa('#messages .message');
          const row=rows[rows.length-1];
          const bubble=row?.querySelector('.bubble');
          if(row && bubble){
            bubble.className='bubble'+(last.content?'':' typing-bubble');
            bubble.innerHTML=last.content ? md(last.content) : '<span class="typing-dots"><i></i><i></i><i></i></span>';
            const view=q('#chatView');
            if(view) view.scrollTop=view.scrollHeight;
            return;
          }
        }
      }
      return originalRenderMessages(animate);
    };
  }

  // The support panel is a real in-app panel, not a form navigation target.
  // Keep its messages local to the panel and use the existing support model.
  const supportForm=q('#supportForm'), supportInput=q('#supportInput'), supportMessages=q('#supportMessages');
  if(supportForm && !supportForm.dataset.novaHotfix){
    supportForm.dataset.novaHotfix='1';
    const history=[];
    const add=(role,text)=>{
      const el=document.createElement('div');
      el.className='support-msg '+role;
      el.textContent=text;
      supportMessages?.appendChild(el);
      if(supportMessages) supportMessages.scrollTop=supportMessages.scrollHeight;
    };
    supportForm.addEventListener('submit',async e=>{
      e.preventDefault();
      e.stopPropagation();
      const text=(supportInput?.value||'').trim();
      if(!text)return;
      const button=supportForm.querySelector('button[type="submit"]');
      if(button?.disabled)return;
      history.push({role:'user',content:text});
      add('user',text);
      if(supportInput)supportInput.value='';
      if(button)button.disabled=true;
      const typing=document.createElement('div');typing.className='support-msg assistant';typing.textContent='در حال بررسی...';supportMessages?.appendChild(typing);if(supportMessages)supportMessages.scrollTop=supportMessages.scrollHeight;
      let answer='';
      try{
        const r=await fetch('/api/chat',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,kind:'support',useWeb:false})});
        if(r.status===401){throw new Error('لطفاً دوباره وارد حساب شوید.');}
        if(!r.ok){let j=await r.json().catch(()=>null);throw new Error(j?.error?.message||'خطا در اتصال به پشتیبانی.');}
        const reader=r.body.getReader(),dec=new TextDecoder();let buf='';
        while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split('\n\n');buf=parts.pop()||'';
          for(const p of parts){if(!p.startsWith('data:'))continue;let d;try{d=JSON.parse(p.slice(5));}catch{continue;}
            if(d.type==='delta')answer+=d.delta;
            else if(d.type==='error')throw new Error(d.message||'خطا در پشتیبانی.');
            else if(d.type==='model_limit')throw new Error(d.message||'مدل پشتیبانی به محدودیت رسیده است.');
          }
        }
        if(!answer)answer='پاسخی از پشتیبانی دریافت نشد. لطفاً دوباره تلاش کنید.';
        typing.remove();add('assistant',answer);history.push({role:'assistant',content:answer});
      }catch(err){typing.remove();add('assistant','⚠️ '+(err.message||'خطا در پشتیبانی.'));history.pop();}
      finally{if(button)button.disabled=false;supportInput?.focus();}
    },true);
  }

  // Update Log: newest first everywhere, and the entry popup shows only one.
  if(typeof loadUpdates==='function'){
    const oldLoad=loadUpdates;
    if(!window.__novaUpdatePatch){
      window.__novaUpdatePatch=true;
      window.loadUpdates=async function(){
        const result=await oldLoad();
        updateCache.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||((b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)));
        if(typeof renderUpdatePopup==='function')renderUpdatePopup();
        if(typeof renderUpdatesPage==='function')renderUpdatesPage();
        return updateCache;
      };
      const oldPopup=renderUpdatePopup;
      window.renderUpdatePopup=function(){
        const box=q('#novaUpdateOverlay .nova-update-list');
        if(!box)return oldPopup();
        const u=updateCache[0];
        box.innerHTML=u?`<article class="nova-update-item"><div class="nova-update-meta"><span class="nova-update-badge">${escUpdate(u.version||'V5')}</span>${escUpdate(u.date||'')}</div><h3>${escUpdate(u.title)}</h3><p>${escUpdate(u.summary||u.details||'')}</p></article>`:'<div class="nova-update-empty">فعلاً آپدیت جدیدی ثبت نشده.</div>';
      };
    }
  }

  // Convert the temporary provider debug strings into useful, distinct user
  // messages without exposing API keys or raw provider internals.
  if(typeof md==='function' && !window.__novaErrorPatch){
    window.__novaErrorPatch=true;
    const classifyProviderError=text=>{
      const s=String(text||'').toLowerCase();
      if(/not configured|provider_not_configured/.test(s))return 'این مدل برای Nova تنظیم نشده است. از Settings → Model AI یک مدل یا ارائه‌دهندهٔ دیگری انتخاب کنید.';
      if(/401|unauthorized|invalid api key|api key/.test(s))return 'احراز هویت سرویس هوش مصنوعی ناموفق بود. تنظیمات مدل و کلید سرویس باید بررسی شود.';
      if(/403|forbidden|permission/.test(s))return 'دسترسی سرویس هوش مصنوعی رد شد. تنظیمات دسترسی مدل باید بررسی شود.';
      if(/404|not found|model.*(not|no).*found/.test(s))return 'مدل انتخاب‌شده پیدا نشد. لطفاً از Settings → Model AI مدل دیگری انتخاب کنید.';
      if(/429|quota|rate.?limit|too many|credits|insufficient/.test(s))return 'سرویس هوش مصنوعی به محدودیت اعتبار یا درخواست رسیده است. مدل دیگری را امتحان کنید.';
      if(/timeout|timed out|aborted|network|fetch failed|econn|socket/.test(s))return 'ارتباط با سرویس هوش مصنوعی برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.';
      if(/400|bad request|invalid.*request/.test(s))return 'درخواست برای مدل انتخاب‌شده معتبر نبود. لطفاً دوباره با یک پیام ساده‌تر امتحان کنید.';
      if(/500|502|503|504|server error|service unavailable/.test(s))return 'خود سرویس هوش مصنوعی موقتاً دچار خطای سرور شده است. کمی بعد دوباره تلاش کنید.';
      return 'سرویس هوش مصنوعی نتوانست پاسخ بدهد. لطفاً مدل دیگری را امتحان کنید یا بعداً دوباره تلاش کنید.';
    };
    window.__novaClassifyProviderError=classifyProviderError;
  }
})();
