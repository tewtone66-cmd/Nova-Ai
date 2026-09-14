import OpenAI from "openai";
import fs from "node:fs";

export const PUBLIC_AI_ERROR = "یک مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کنید.";
export const PERSONALITY_MODES = ["smart","casual","sticker","serious","research"];

const PERSONALITY_TEXT = {
  smart: "لحن: دقیق، تحلیلی و عمیق.",
  casual: "لحن: خودمونی و رفیقانه.",
  sticker: "لحن: پرانرژی و بامزه.",
  serious: "لحن: رسمی، کوتاه و مستقیم.",
  research: "لحن: پژوهشی و ساختاریافته."
};

const BRAND_IDENTITY = `تو Nova هستی؛ یک دستیار هوش مصنوعی ساخته‌شده توسط تیم Nova AI.
هرگز ادعا نکن که خودت محصول مستقیم Google، OpenAI یا شرکت دیگری هستی.
اگر درباره فناوری زیرین پرسیده شد، صادقانه توضیح بده که Nova از مدل‌ها و سرویس‌های مختلف استفاده می‌کند.`;

const SUPPORT_KNOWLEDGE = `
اطلاعات داخلی بخش پشتیبانی Nova:
- Nova یک AI Workspace شخصی است و کاربر می‌تواند حساب بسازد، وارد شود یا به‌عنوان مهمان وارد شود.
- گفتگوها، تنظیمات و حافظه برای هر حساب به‌صورت جداگانه نگهداری می‌شوند و نباید اطلاعات یک کاربر به کاربر دیگر نسبت داده شود.
- Nova قابلیت‌های ChatBot، کدنویسی با Codex، ساخت تصویر و Video را در رابط کاربری دارد.
- در Settings → Model AI کاربر می‌تواند برای ChatBot، Codex، Image Creator و Video مدل/ارائه‌دهنده انتخاب کند.
- ChatBot از ارائه‌دهنده انتخاب‌شده در تنظیمات Chat استفاده می‌کند؛ پشتیبانی نیز دقیقاً از همان مدل ChatBot انتخاب‌شده استفاده می‌کند.
- پشتیبانی یک دستیار هوش مصنوعی داخلی است و برای راهنمایی درباره خود Nova، تنظیمات، خطاهای رابط، قابلیت‌ها و روش استفاده طراحی شده است.
- پشتیبانی به‌صورت پیش‌فرض دسترسی مستقیم به اطلاعات خصوصی حساب، رمز عبور، کلیدهای API، دیتابیس یا لاگ‌های محرمانه ندارد و نباید وانمود کند که دارد.
- اگر کاربر مشکل فنی را گزارش کرد، اول مشکل را دقیق و ساده بررسی و مراحل امن و عملی پیشنهاد کن.
- اگر مشکل به چیزی نیاز دارد که از داخل چت قابل مشاهده نیست، صادقانه بگو که نمی‌توانی آن بخش را مستقیماً ببینی و اطلاعات لازم را از کاربر بخواه.
- اگر کاربر درباره قابلیت یا تنظیمی سؤال کرد که مطمئن نیستی وجود دارد، حدس نزن؛ بگو از اطلاعات موجود مطمئن نیستی.
- موضوع پشتیبانی باید همیشه حول Nova و استفاده از آن باشد. اگر سؤال کاملاً خارج از پشتیبانی بود، کوتاه بگو که این بخش مخصوص پشتیبانی Nova است و پیشنهاد کن سؤال را در ChatBot اصلی بپرسد.
- پاسخ‌ها فارسی، دوستانه، واضح و تا حد ممکن کوتاه باشند؛ برای مراحل، شماره‌گذاری استفاده کن.
- هرگز از کاربر رمز عبور، API key، session cookie یا اطلاعات امنیتی حساس درخواست نکن.
`;

function buildInstructions(settings = {}, kind = "text") {
  return [
    `You are ${settings.novaName || "Nova"}, a professional AI assistant.`,
    BRAND_IDENTITY,
    PERSONALITY_TEXT[settings.personality] || PERSONALITY_TEXT.smart,
    "Do not claim to have performed actions you did not actually perform.",
    "Use Markdown when useful. Put code inside fenced code blocks.",
    kind === "coding" ? "For coding tasks, be technically accurate and provide complete code when requested." : "",
    kind === "support" ? `تو در نقش «پشتیبانی Nova» هستی. فقط برای پشتیبانی از خود Nova پاسخ بده.\n${SUPPORT_KNOWLEDGE}` : "",
    settings.customPrompt ? `دستورهای دائمی کاربر:\n${settings.customPrompt}` : "",
    settings.novaBio ? `Assistant profile: ${settings.novaBio}` : "",
    settings.userName ? `User's name is ${settings.userName}.` : ""
  ].filter(Boolean).join("\n\n");
}

function providerFor(settings = {}, kind = "text") {
  const models = settings.aiModels || {};
  if (kind === "coding") return models.coding || "openai";
  if (kind === "image") return models.image || "openai";
  if (kind === "video") return models.video || "pixverse";
  return models.chat || "openai";
}

function configFor(provider) {
  const configs = {
    openai: { key: process.env.OPENAI_API_KEY, baseURL: "https://api.openai.com/v1", model: process.env.OPENAI_MODEL || "gpt-5" },
    gemini: { key: process.env.GEMINI_API_KEY, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
    openrouter: { key: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1", model: process.env.OPENROUTER_MODEL || "openai/gpt-5" }
  };
  return configs[provider] || null;
}

export function getAIInfo(settings = {}, kind = "text") {
  const provider = providerFor(settings, kind);
  const config = configFor(provider);
  return { provider, model: config?.model || "unknown", configured: Boolean(config?.key) };
}

export function classify(text) {
  const t = String(text || "").toLowerCase();
  if (/(generate|create|make|draw|image|photo|picture|عکس|تصویر|بساز|ساخت عکس)/i.test(t)) return "image";
  if (/(code|coding|debug|bug|javascript|python|typescript|html|css|react|node|کد|برنامه نویسی|باگ|خطا)/i.test(t)) return "coding";
  return "text";
}

export function modelFor(kind = "text", settings = {}) { return configFor(providerFor(settings, kind))?.model || "unknown"; }

export async function* streamResponse({ messages, settings = {}, kind = "text", useWeb = false, signal }) {
  const provider = providerFor(settings, kind);
  const config = configFor(provider);
  if (!config?.key) throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${provider}`);
  if (provider === "openai") {
    const ai = new OpenAI({ apiKey: config.key, baseURL: config.baseURL });
    const input = messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") }));
    const response = await ai.responses.create({ model: config.model, instructions: buildInstructions(settings, kind), input, tools: useWeb ? [{type:"web_search_preview"}] : undefined, stream: true });
    for await (const event of response) {
      if (event.type === "response.output_text.delta") yield { text: event.delta };
      if (event.type === "response.completed" && event.response?.usage) yield { usageMetadata: event.response.usage };
    }
    return;
  }
  const ai = new OpenAI({ apiKey: config.key, baseURL: config.baseURL });
  const response = await ai.chat.completions.create({
    model: config.model,
    messages: [{role:"system",content:buildInstructions(settings,kind)}, ...messages.map(m => ({role:m.role === "assistant" ? "assistant" : "user", content:String(m.content || "")}))],
    stream: true,
    stream_options: {include_usage:true}
  }, signal ? { signal } : undefined);
  for await(const chunk of response) {
    const text = chunk.choices?.[0]?.delta?.content;
    if(text) yield {text};
    if(chunk.usage) yield {usageMetadata:chunk.usage};
  }
}

function imageMime(file) {
  const ext = String(file || "").toLowerCase();
  return ext.endsWith(".jpg") || ext.endsWith(".jpeg") ? "image/jpeg" : ext.endsWith(".webp") ? "image/webp" : "image/png";
}

async function generateOpenAIImage(prompt, imageFile, size) {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI_PROVIDER_NOT_CONFIGURED:openai");
  const ai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  return ai.images.generate({model:process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", prompt, size:size || "1024x1024"});
}

async function generateGeminiImage(prompt, imageFile) {
  if (!process.env.GEMINI_API_KEY) throw new Error("AI_PROVIDER_NOT_CONFIGURED:gemini");
  const parts = [{text:prompt}];
  if (imageFile) parts.push({inline_data:{mime_type:imageMime(imageFile),data:fs.readFileSync(imageFile).toString("base64")}});
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseModalities:["TEXT","IMAGE"]}})});
  if(!r.ok) throw new Error(`Gemini image ${r.status}`);
  return r.json();
}

async function generateStabilityImage(prompt, imageFile) {
  if (!process.env.STABILITY_API_KEY) throw new Error("AI_PROVIDER_NOT_CONFIGURED:stability");
  const form = new FormData();
  form.append("prompt",prompt);
  if (imageFile) form.append("image",new Blob([fs.readFileSync(imageFile)]),"reference.png");
  const r = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core",{method:"POST",headers:{Authorization:`Bearer ${process.env.STABILITY_API_KEY}`,Accept:"application/json"},body:form});
  if(!r.ok) throw new Error(`Stability image ${r.status}`);
  return r.json();
}

export async function generateImage({prompt,imageFile,size,settings={}}) {
  const provider = providerFor(settings,"image");
  if(provider === "gemini") return generateGeminiImage(prompt,imageFile);
  if(provider === "stability") return generateStabilityImage(prompt,imageFile);
  if(provider === "openai") return generateOpenAIImage(prompt,imageFile,size);
  throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${provider}`);
}

export async function extractMemory({userText,assistantText,enabledCategories} = {}) {
  if(!userText || !enabledCategories?.length) return null;
  return null;
}

export async function generateTitle(text) {
  if(!process.env.OPENAI_API_KEY) return "گفتگوی جدید";
  try {
    const ai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response = await ai.responses.create({model:process.env.OPENAI_MODEL || "gpt-5",input:`برای این گفتگو یک عنوان خیلی کوتاه فارسی بساز:\n${String(text||"").slice(0,2000)}`,max_output_tokens:30});
    return response.output_text?.trim() || "گفتگوی جدید";
  } catch { return "گفتگوی جدید"; }
}