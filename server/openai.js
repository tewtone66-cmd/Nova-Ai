import OpenAI from "openai";

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export function modelFor(kind = "text", settings = {}) {
  const selected = settings?.aiModels || {};

  if (kind === "coding") {
    if (selected.coding === "openai") {
      return process.env.OPENAI_CODING_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
    }
  }

  if (kind === "text" || kind === "chat") {
    if (selected.chat === "openai") {
      return process.env.OPENAI_MODEL || "gpt-5-mini";
    }
  }

  return process.env.OPENAI_MODEL || "gpt-5-mini";
}

export function classify(text) {
  const t = (text || "").toLowerCase();
  if (/(generate|create|make|draw|image|photo|picture|عکس|تصویر|بساز|ساخت عکس|تصویر بساز)/i.test(t)) return "image";
  if (/(code|coding|debug|bug|javascript|python|typescript|html|css|react|node|کد|برنامه نویسی|باگ|خطا)/i.test(t)) return "coding";
  return "text";
}

export const PERSONALITY_MODES = [
  "smart",
  "casual",
  "sticker",
  "serious",
  "research"
];

const PERSONALITY_TEXT = {
  smart: "لحن: دقیق، تحلیلی و عمیق. قبل از پاسخ نهایی جوانب مختلف موضوع را در نظر بگیر و با جزئیات فنی درست و ساختاریافته پاسخ بده.",
  casual: "لحن: خودمونی و رفیقانه. از زبان محاوره‌ای و روزمره فارسی استفاده کن، انگار داری با یه دوست حرف می‌زنی؛ رسمی و خشک صحبت نکن.",
  sticker: "لحن: پرانرژی و بامزه. طبیعی و متناسب با محتوا از ایموجی استفاده کن، اما دقت پاسخ را فدای ایموجی نکن.",
  serious: "لحن: رسمی، کوتاه و مستقیم. بدون شوخی و بدون ایموجی.",
  research: "لحن: پژوهشی. موضوع را از چند زاویه بررسی کن و پاسخ را ساختاریافته ارائه بده."
};

const BRAND_IDENTITY = `تو Nova هستی — یک دستیار هوش مصنوعی که توسط «تیم Nova AI» ساخته شده و متعلق به همان تیم است.
هرگز نگو که ساخته‌ی مستقیم Google، OpenAI یا شرکت دیگری هستی و خودت را با نام مدل زیرین معرفی نکن.
اگر کاربر درباره زیرساخت فنی یا مدل زبانی پرسید، صادقانه بگو Nova از فناوری مدل‌های هوش مصنوعی استفاده می‌کند و هویت و محصول Nova متعلق به تیم Nova AI است.`;

export function buildInstructions(settings = {}, kind) {
  const personality =
    PERSONALITY_TEXT[settings.personality] || PERSONALITY_TEXT.smart;

  return [
    `You are ${settings.novaName || "Nova"}, a professional AI assistant.`,
    BRAND_IDENTITY,
    personality,
    "Do not claim to have done actions you did not actually do.",
    "Use Markdown when it improves readability. Put code in fenced code blocks.",
    kind === "coding"
      ? "For coding tasks, explain important assumptions, provide complete code when requested, and carefully inspect likely errors."
      : "",
    settings.customPrompt
      ? `دستورهای دائمی کاربر:\n${settings.customPrompt}`
      : "",
    settings.novaBio
      ? `Assistant profile: ${settings.novaBio}`
      : "",
    settings.userName
      ? `User's name is ${settings.userName} — address them naturally.`
      : ""
  ].filter(Boolean).join("\n\n");
}


function selectedProvider(settings = {}, kind = "text") {
  const models = settings?.aiModels || {};

  if (kind === "coding") return models.coding || "openai";
  if (kind === "image") return models.image || "openai";
  if (kind === "video") return models.video || "kling";

  return models.chat || "openai";
}

function providerConfig(provider) {
  const configs = {
    openai: {
      key: process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-5-mini"
    },
    groq: {
      key: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b"
    },
    gemini: {
      key: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash"
    },
    claude: {
      key: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5"
    },
    openrouter: {
      key: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "openai/gpt-5"
    }
  };

  return configs[provider] || null;
}

export async function* streamResponse({
  messages,
  settings,
  kind,
  useWeb = false,
  signal
}) {
  const provider = selectedProvider(settings, kind);
  const config = providerConfig(provider);

  if (!config?.key) {
    throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${provider}`);
  }

  const ai = new OpenAI({
    apiKey: config.key,
    baseURL: config.baseURL
  });

  const input = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "")
  }));

  const response = await ai.responses.create({
    model: provider === "openai"
      ? modelFor(kind, settings)
      : config.model,
    instructions: buildInstructions(settings, kind),
    input,
    tools: useWeb && provider === "openai"
      ? [{ type: "web_search_preview" }]
      : undefined,
    stream: true
  });

  for await (const event of response) {
    if (event.type === "response.output_text.delta") {
      yield { text: event.delta };
    }

    if (event.type === "response.completed" && event.response?.usage) {
      yield { usageMetadata: event.response.usage };
    }
  }
}

export async function generateImage({ prompt, imageFile }) {
  const ai = getClient();

  const input = [{ type: "input_text", text: prompt }];

  if (imageFile) {
    const fs = await import("node:fs");
    const buffer = fs.readFileSync(imageFile);

    const mimeType =
      imageFile.toLowerCase().endsWith(".jpg") ||
      imageFile.toLowerCase().endsWith(".jpeg")
        ? "image/jpeg"
        : "image/png";

    input.push({
      type: "input_image",
      image_url: `data:${mimeType};base64,${buffer.toString("base64")}`
    });
  }

  return ai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    prompt,
    size: process.env.OPENAI_IMAGE_SIZE || "1024x1024"
  });
}

export async function extractMemory({
  userText,
  assistantText,
  enabledCategories
}) {
  try {
    const ai = getClient();

    const categories = Object.entries(enabledCategories || {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (!categories.length) return null;

    const resp = await ai.responses.create({
      model: modelFor("text"),
      instructions: "فقط JSON خام برگردان و هیچ متن دیگری ننویس.",
      input: `از این تبادل پیام، فقط اگر یک واقعیت پایدار و قابل استفاده در آینده درباره کاربر وجود دارد استخراج کن.

دسته‌های مجاز: ${categories.join(", ")}

فرمت:
{"fact":"...یا null","category":"...یا null"}

پیام کاربر:
${userText}

پاسخ دستیار:
${(assistantText || "").slice(0, 500)}`,
      max_output_tokens: 120
    });

    const cleaned = (resp.output_text || "")
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (
      parsed?.fact &&
      parsed.fact !== "null" &&
      categories.includes(parsed.category)
    ) {
      return {
        text: String(parsed.fact).slice(0, 300),
        category: parsed.category
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function generateTitle(firstUserMessage) {
  try {
    const ai = getClient();

    const resp = await ai.responses.create({
      model: modelFor("text"),
      instructions:
        "یک عنوان بسیار کوتاه حداکثر ۵ کلمه‌ای برای گفتگو بده. بدون نقل‌قول و نقطه.",
      input: firstUserMessage,
      max_output_tokens: 24
    });

    const title = (resp.output_text || "")
      .trim()
      .replace(/^["'«]|["'»]$/g, "");

    return title.slice(0, 48) || null;
  } catch {
    return null;
  }
}
