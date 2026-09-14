import fs from "node:fs";

const uxPath = "public/ux-fixes.js";
const aiPath = "server/openai.js";

function patchUX() {
  let s = fs.readFileSync(uxPath, "utf8");
  s = s.replace("setTimeout(()=>send.dataset.busy='0',1200)", "setTimeout(()=>send.dataset.busy='0',260)");
  s = s.replace("updateCache.slice(0,3)", "updateCache.slice(0,1)");
  const marker = "/* NOVA_STABILITY_HOTFIX_RUNTIME */";
  if (!s.includes(marker)) {
    s += `

${marker}
(() => {
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  const classifyAIError = text => {
    const s = String(text || "").toLowerCase();
    if (/not configured|provider_not_configured/.test(s)) return "این مدل برای Nova تنظیم نشده است. از Settings → Model AI یک مدل دیگر انتخاب کنید.";
    if (/401|unauthorized|invalid api key|api key/.test(s)) return "احراز هویت سرویس هوش مصنوعی ناموفق بود. تنظیمات سرویس باید بررسی شود.";
    if (/403|forbidden|permission/.test(s)) return "دسترسی سرویس هوش مصنوعی رد شد. تنظیمات دسترسی مدل باید بررسی شود.";
    if (/404|not found|model.*(not|no).*found/.test(s)) return "مدل انتخاب‌شده پیدا نشد. از Settings → Model AI مدل دیگری انتخاب کنید.";
    if (/429|quota|rate.?limit|credits|insufficient/.test(s)) return "سرویس هوش مصنوعی به محدودیت اعتبار یا درخواست رسیده است. مدل دیگری را امتحان کنید.";
    if (/timeout|timed out|network|fetch failed|econn|socket/.test(s)) return "ارتباط با سرویس هوش مصنوعی برقرار نشد. دوباره تلاش کنید.";
    if (/400|bad request|invalid.*request/.test(s)) return "درخواست برای مدل انتخاب‌شده معتبر نبود. دوباره امتحان کنید.";
    if (/500|502|503|504|server error|service unavailable/.test(s)) return "سرویس هوش مصنوعی موقتاً خطای سرور دارد. کمی بعد دوباره تلاش کنید.";
    return "سرویس هوش مصنوعی نتوانست پاسخ بدهد. لطفاً مدل دیگری را امتحان کنید.";
  };

  const style = document.createElement("style");
  style.textContent = `
    .composer-wrap,.composer,.composer button,.composer textarea{pointer-events:auto!important}
    .composer,#composer,#sendBtn{touch-action:manipulation!important}
    .composer-note{pointer-events:none!important}
    .chat-item .rename{width:30px!important;height:30px!important;min-width:30px!important;padding:0!important;display:grid!important;place-items:center!important;font-size:0!important;border:1px solid var(--border)!important;border-radius:9px!important;background:transparent!important;color:var(--muted,var(--text))!important}
    .chat-item .rename::before{content:"✎";font-size:15px!important}
  `;
  document.head.appendChild(style);

  const install = () => {
    const form = q("#supportForm"), input = q("#supportInput"), box = q("#supportMessages");
    if (!form || form.dataset.novaSupportRuntime) return;
    form.dataset.novaSupportRuntime = "1";
    const history = [];
    const add = (role, text) => {
      const el = document.createElement("div");
      el.className = `support-msg support-${role}`;
      el.textContent = text;
      box?.appendChild(el);
      if (box) box.scrollTop = box.scrollHeight;
      return el;
    };
    form.addEventListener("submit", async e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const text = (input?.value || "").trim();
      if (!text || form.dataset.busy === "1") return;
      form.dataset.busy = "1";
      history.push({ role: "user", content: text });
      add("user", text);
      if (input) input.value = "";
      const send = form.querySelector("button[type=submit]");
      if (send) send.disabled = true;
      const typing = add("bot", "در حال بررسی...");
      let answer = "";
      try {
        const r = await fetch("/api/chat", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, kind: "support", useWeb: false })
        });
        if (!r.ok) throw new Error("ارتباط با پشتیبانی برقرار نشد.");
        const reader = r.body.getReader(), decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\\n\\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            let data;
            try { data = JSON.parse(part.slice(5)); } catch { continue; }
            if (data.type === "delta") answer += data.delta || "";
            if (data.type === "error") throw new Error(data.message || "خطا در پشتیبانی.");
          }
        }
        typing.remove();
        add("bot", answer || "پاسخی دریافت نشد.");
        history.push({ role: "assistant", content: answer });
      } catch (err) {
        typing.remove();
        add("bot", "⚠️ " + (err.message || "خطا در پشتیبانی."));
        history.pop();
      } finally {
        form.dataset.busy = "0";
        if (send) send.disabled = false;
        input?.focus();
      }
    }, true);
  };

  const patchStreaming = () => {
    if (typeof window.renderMessages !== "function" || window.__novaStableRender) return;
    window.__novaStableRender = true;
    const original = window.renderMessages;
    window.renderMessages = function(animate = true) {
      if (!animate && window.state?.current?.messages?.length) {
        const message = window.state.current.messages.at(-1);
        if (message?.role === "assistant") {
          if (/DEBUG\\s+(OPENAI|GEMINI|OPENROUTER)/i.test(message.content || "")) message.content = classifyAIError(message.content);
          const rows = qa("#messages .message");
          const row = rows.at(-1);
          const bubble = row?.querySelector(".bubble");
          if (row && bubble && typeof window.md === "function") {
            bubble.className = "bubble" + (message.content ? "" : " typing-bubble");
            bubble.innerHTML = message.content ? window.md(message.content) : '<span class="typing-dots"><i></i><i></i><i></i></span>';
            const view = q("#chatView");
            if (view) view.scrollTop = view.scrollHeight;
            return;
          }
        }
      }
      return original.apply(this, arguments);
    };
  };

  const boot = () => { install(); patchStreaming(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
})();
`;
  }
  fs.writeFileSync(uxPath, s);
}

function patchAI() {
  let s = fs.readFileSync(aiPath, "utf8");
  const marker = "// NOVA_DISTINCT_PROVIDER_ERRORS";
  if (s.includes(marker)) return;
  s = s.replace(
    "yield { text: PUBLIC_AI_ERROR };\n      return;",
    "yield { text: `\\n\\n⚠️ DEBUG ${provider.toUpperCase()}: ${error?.message || String(error || PUBLIC_AI_ERROR)}` };\n      return;"
  );
  s = s.replace(
    "yield { text: `\\n\\n${PUBLIC_AI_ERROR}` };",
    "yield { text: `\\n\\n⚠️ DEBUG ${provider.toUpperCase()}: ${error?.message || String(error || PUBLIC_AI_ERROR)}` };"
  );
  s += `\n${marker}\n`;
  fs.writeFileSync(aiPath, s);
}

patchUX();
patchAI();
console.log("Nova stability hotfix applied");
