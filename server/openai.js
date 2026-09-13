import {GoogleGenAI} from "@google/genai";

let client;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  client ??= new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
  return client;
}

export function modelFor(kind="text") {
  if (kind === "coding") return process.env.GEMINI_CODING_MODEL || process.env.GEMINI_MODEL || "gemini-3.6-flash";
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

export function classify(text) {
  const t = (text || "").toLowerCase();
  if (/(generate|create|make|draw|image|photo|picture|عکس|تصویر|بساز|ساخت عکس|تصویر بساز)/i.test(t)) return "image";
  if (/(code|coding|debug|bug|javascript|python|typescript|html|css|react|node|کد|برنامه نویسی|باگ|خطا)/i.test(t)) return "coding";
  return "text";
}

// The mood slider — exactly 5 stops. Index order matters: it's what the
// frontend's draggable slider maps 0..4 onto.
export const PERSONALITY_MODES = ["smart", "casual", "sticker", "serious", "research"];

const PERSONALITY_TEXT = {
  smart: "لحن: دقیق، تحلیلی و عمیق. قبل از پاسخ نهایی جوانب مختلف موضوع را در نظر بگیر و با جزئیات فنی درست و ساختاریافته پاسخ بده.",
  casual: "لحن: خودمونی و رفیقانه. از زبان محاوره‌ای و روزمره فارسی استفاده کن، انگار داری با یه دوست حرف می‌زنی؛ رسمی و خشک صحبت نکن.",
  sticker: "لحن: پرانرژی و بامزه. طبیعی و متناسب با محتوا از ایموجی و استیکر متنی استفاده کن تا حال‌وهوای پاسخ‌ها شاد باشد، اما هیچ‌وقت محتوای دقیق و مفید پاسخ را فدای ایموجی نکن.",
  serious: "لحن: رسمی، کوتاه و مستقیم. بدون شوخی، بدون ایموجی؛ فقط نکته‌ی اصلی و ضروری را دقیق و کوتاه بگو.",
  research: "لحن: پژوهشی. موضوع را از چند زاویه بررسی کن، فرضیات را روشن کن، در صورت فعال بودن جستجوی وب از نتایج آن به‌عنوان منبع استفاده و به آن‌ها اشاره کن، و پاسخ را ساختاریافته (با عنوان‌بندی در صورت نیاز) ارائه بده."
};

const BRAND_IDENTITY = `تو Nova هستی — یک دستیار هوش مصنوعی که توسط «تیم Nova AI» ساخته شده و متعلق به همان تیم است.
هرگز نگو که ساخته‌ی مستقیم Google، OpenAI یا هر شرکت دیگری هستی و هرگز خودت را با نام مدل زیرینت معرفی نکن.
اگر کاربر صراحتاً پرسید که زیرساخت فنی یا مدل زبانی‌ات از کجاست، صادقانه بگو که بخشی از فناوری زیرساختی‌ات از فناوری‌های هوش مصنوعی گوگل (Gemini) استفاده می‌کند، اما هویت، شخصیت، برند و محصول Nova متعلق به تیم Nova AI است.`;

export function buildInstructions(settings, kind) {
  const personality = PERSONALITY_TEXT[settings.personality] || PERSONALITY_TEXT.smart;

  return [
    `You are ${settings.novaName || "Nova"}, a professional AI assistant.`,
    BRAND_IDENTITY,
    personality,
    "Do not claim to have done actions you did not actually do.",
    "Use Markdown when it improves readability. Put code in fenced code blocks.",
    kind === "coding" ? "For coding tasks, explain important assumptions, provide complete code when requested, and carefully inspect likely errors." : "",
    settings.customPrompt ? `دستورهای دائمی کاربر که همیشه باید رعایت کنی (این‌ها را قبل از هر پاسخ در نظر بگیر):\n${settings.customPrompt}` : "",
    settings.novaBio ? `Assistant profile: ${settings.novaBio}` : "",
    settings.userName ? `User's name is ${settings.userName} — address them naturally.` : ""
  ].filter(Boolean).join("\n\n");
}

export async function streamResponse({messages, settings, kind, useWeb=false, signal}) {
  const ai = getClient();
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{text: m.content}]
  }));

  const config = {
    systemInstruction: buildInstructions(settings, kind)
  };

  if (useWeb) config.tools = [{googleSearch: {}}];

  return ai.models.generateContentStream({
    model: modelFor(kind),
    contents,
    config
  });
}

export async function generateImage({prompt, imageFile, size="1024x1024"}) {
  const ai = getClient();
  const parts = [{text: prompt}];

  if (imageFile) {
    const fs = await import("node:fs");
    const buffer = fs.readFileSync(imageFile);
    const mimeType = imageFile.toLowerCase().endsWith(".jpg") || imageFile.toLowerCase().endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
    parts.unshift({inlineData:{mimeType,data:buffer.toString("base64")}});
  }

  return ai.models.generateContent({
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    contents: [{role:"user",parts}],
    config: {responseModalities:["TEXT","IMAGE"]}
  });
}

/**
 * Selective memory extraction. Runs a tiny, cheap call after a real chat
 * turn and asks: "is there a durable fact worth remembering here?" Returns
 * null for small talk / one-off questions — only genuine hits get saved.
 */
export async function extractMemory({ userText, assistantText, enabledCategories }) {
  try {
    const ai = getClient();
    const categories = Object.entries(enabledCategories).filter(([,v]) => v).map(([k]) => k);
    if (!categories.length) return null;

    const resp = await ai.models.generateContent({
      model: modelFor("text"),
      contents: [{
        role: "user",
        parts: [{text:
          `از این تبادل پیام، فقط اگر یک واقعیت پایدار و قابل استفاده در آینده درباره‌ی کاربر وجود دارد (نه گپ‌ زدن معمولی یا سؤال یک‌بار مصرف) استخراج کن.\n` +
          `دسته‌های مجاز: ${categories.join(", ")}.\n` +
          `فقط یک JSON خام و بدون هیچ متن اضافه برگردان: {"fact":"...یا null","category":"...یا null"}\n\n` +
          `پیام کاربر: ${userText}\nپاسخ دستیار: ${(assistantText||"").slice(0,500)}`
        }]
      }],
      config: { systemInstruction: "You output only compact raw JSON, nothing else.", maxOutputTokens: 120 }
    });
    const raw = resp.text || resp.candidates?.[0]?.content?.parts?.map(p=>p.text).join("") || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed?.fact && parsed.fact !== "null" && categories.includes(parsed.category)) {
      return { text: String(parsed.fact).slice(0, 300), category: parsed.category };
    }
    return null;
  } catch {
    return null; // memory extraction is best-effort — never break the main chat flow
  }
}

/** Short, smart auto-title for a new conversation (like ChatGPT's chat naming). */
export async function generateTitle(firstUserMessage) {
  try {
    const ai = getClient();
    const resp = await ai.models.generateContent({
      model: modelFor("text"),
      contents: [{ role: "user", parts: [{text: `یک عنوان بسیار کوتاه (حداکثر ۵ کلمه) برای این گفتگو بده، بدون علامت نقل‌قول و بدون نقطه پایانی:\n${firstUserMessage}`}] }],
      config: { maxOutputTokens: 24 }
    });
    const title = (resp.text || "").trim().replace(/^["'«]|["'»]$/g, "");
    return title.slice(0, 48) || null;
  } catch {
    return null;
  }
}
