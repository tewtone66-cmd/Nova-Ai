import fs from "node:fs";

const uxPath = "public/ux-fixes.js";
const aiPath = "server/openai.js";

function patchUX(){
  let s=fs.readFileSync(uxPath,"utf8");
  s=s.replace("setTimeout(()=>send.dataset.busy='0',1200)","setTimeout(()=>send.dataset.busy='0',260)");
  s=s.replace("updateCache.slice(0,3)","updateCache.slice(0,1)");
  const marker="NOVA_STABILITY_HOTFIX_RUNTIME";
  if(!s.includes(marker)){
    s += `\n/* ${marker} */\n(()=>{\nconst style=document.createElement('style');\nstyle.textContent='.composer-wrap,.composer,.composer button,.composer textarea{pointer-events:auto!important}.composer,#composer,#sendBtn{touch-action:manipulation!important}.composer-note{pointer-events:none!important}.chat-item .rename{width:30px!important;height:30px!important;min-width:30px!important;padding:0!important;display:grid!important;place-items:center!important;font-size:0!important;border:1px solid var(--border)!important;border-radius:9px!important;background:transparent!important;color:var(--muted,var(--text))!important}.chat-item .rename::before{content:"✎";font-size:15px!important}';document.head.appendChild(style);\nconst support=()=>{const form=document.querySelector('#supportForm'),input=document.querySelector('#supportInput'),box=document.querySelector('#supportMessages');if(!form||form.dataset.novaSupport)return;form.dataset.novaSupport='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const text=(input?.value||'').trim();if(!text||form.dataset.busy)return;form.dataset.busy='1';const add=(r,t)=>{const x=document.createElement('div');x.className='support-msg support-'+r;x.textContent=t;box?.appendChild(x);if(box)box.scrollTop=box.scrollHeight;return x};add('user',text);if(input)input.value='';const send=form.querySelector('button[type=submit]');if(send)send.disabled=true;const typing=add('bot','در حال بررسی...');try{const r=await fetch('/api/chat',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}],kind:'support',useWeb:false})});if(!r.ok)throw Error('ارتباط با پشتیبانی برقرار نشد.');const reader=r.body.getReader(),decoder=new TextDecoder();let buf='',ans='';while(true){const z=await reader.read();if(z.done)break;buf+=decoder.decode(z.value,{stream:true});const parts=buf.split('\\n\\n');buf=parts.pop()||'';for(const p of parts){if(!p.startsWith('data:'))continue;try{const d=JSON.parse(p.slice(5));if(d.type==='delta')ans+=d.delta||'';if(d.type==='error')throw Error(d.message||'خطا در پشتیبانی.')}catch(err){if(err.message!=='Unexpected end of JSON input')throw err}}}typing.remove();add('bot',ans||'پاسخی دریافت نشد.')}catch(err){typing.remove();add('bot','⚠️ '+(err.message||'خطا در پشتیبانی.'))}finally{form.dataset.busy='';if(send)send.disabled=false;input?.focus()}},true)};\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',support,{once:true});else support();new MutationObserver(support).observe(document.documentElement,{childList:true,subtree:true});\n})();\n`;
  }
  fs.writeFileSync(uxPath,s);
}

function patchAI(){
  let s=fs.readFileSync(aiPath,"utf8");
  if(!s.includes("NOVA_DISTINCT_PROVIDER_ERRORS")){
    s=s.replace("yield { text: PUBLIC_AI_ERROR };\n      return;","yield { text: `\\n\\n⚠️ DEBUG ${provider.toUpperCase()}: ${error?.message || String(error || PUBLIC_AI_ERROR)}` };\n      return;");
    s=s.replace("yield { text: `\\n\\n${PUBLIC_AI_ERROR}` };","yield { text: `\\n\\n⚠️ DEBUG ${provider.toUpperCase()}: ${error?.message || String(error || PUBLIC_AI_ERROR)}` };");
    s += "\n// NOVA_DISTINCT_PROVIDER_ERRORS\n";
    fs.writeFileSync(aiPath,s);
  }
}

patchUX();
patchAI();
console.log("Nova hotfix applied");
