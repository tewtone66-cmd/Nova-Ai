import OpenAI from "openai";

let openaiClient;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  openaiClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  return openaiClient;
}

export const PERSONALITY_MODES = [
  "smart",
  "casual",
  "sticker",
  "serious",
  "research"
];

const PERSONALITY_TEXT = {
  smart: "لحن: دقیق، تحلیلی و عمیق.",
  casual: "لحن: خودمونی و رفیقانه.",
  sticker: "لحن: پرانرژی و بامزه.",
  serious: "لحن: رسمی، کوتاه و مستقیم.",
  research: "لحن: پژوهشی و ساختاریافته."
};

const BRAND_IDENTITY = `
تو Nova هستی؛ یک دستیار هوش مصنوعی ساخته‌شده توسط تیم Nova AI.
هرگز ادعا نکن که خودت محصول مستقیم Google، OpenAI یا شرکت دیگری هستی.
اگر درباره فناوری زیرین پرسیده شد، صادقانه توضیح بده که Nova از مدل‌ها و سرویس‌های هوش مصنوعی مختلف استفاده می‌کند.
`;

function buildInstructions(settings = {}, kind = "text") {
  const personality =
    PERSONALITY_TEXT[settings.personality] ||
    PERSONALITY_TEXT.smart;

  return [
    `You are ${settings.novaName || "Nova"}, a professional AI assistant.`,
    BRAND_IDENTITY,
    personality,
    "Do not claim to have performed actions you did not actually perform.",
    "Use Markdown when useful. Put code inside fenced code blocks.",
    kind === "coding"
      ? "For coding tasks, provide accurate technical explanations and complete code when requested."
      : "",
    settings.customPrompt
      ? `دستورهای دائمی کاربر:\n${settings.customPrompt}`
      : "",
    settings.novaBio
      ? `Assistant profile: ${settings.novaBio}`
      : "",
    settings.userName
      ? `User's name is ${settings.userName}.`
      : ""
  ].filter(Boolean).join("\n\n");
}

function getProvider(settings = {}, kind = "text") {
  const models = settings.aiModels || {};

  if (kind === "coding") {
    return models.coding || "openai";
  }

  if (kind === "image") {
    return models.image || "openai";
  }

  if (kind === "video") {
    return models.video || "pixverse";
  }

  return models.chat || "openai";
}

function getProviderConfig(provider) {
  const configs = {
    openai: {
      key: process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna"
    },

    gemini: {
      key: process.env.GEMINI_API_KEY,
      baseURL:
        "https://generativelanguage.googleapis.com/v1beta/openai/",
      model:
        process.env.GEMINI_MODEL || "gemini-3.8-flash"
    },

    openrouter: {
      key: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model:
        process.env.OPENROUTER_MODEL || "openai/gpt-5"
    }
  };

  return configs[provider] || null;
}

export function classify(text) {
  const t = String(text || "").toLowerCase();

  if (
    /(generate|create|make|draw|image|photo|picture|عکس|تصویر|بساز|ساخت عکس)/i.test(t)
  ) {
    return "image";
  }

  if (
    /(code|coding|debug|bug|javascript|python|typescript|html|css|react|node|کد|برنامه نویسی|باگ|خطا)/i.test(t)
  ) {
    return "coding";
  }

  return "text";
}

export function modelFor(kind = "text", settings = {}) {
  const provider = getProvider(settings, kind);
  const config = getProviderConfig(provider);

  return config?.model || process.env.OPENAI_MODEL || "gpt-5.6-luna";
}

export async function* streamResponse({
  messages,
  settings,
  kind,
  useWeb = false,
  signal
}) {
  const provider = getProvider(settings, kind);
  const config = getProviderConfig(provider);

  if (!config?.key) {
    throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${provider}`);
  }

  const ai = new OpenAI({
    apiKey: config.key,
    baseURL: config.baseURL
  });

  const input = messages.map(message => ({
    role:
      message.role === "assistant"
        ? "assistant"
        : "user",
    content: String(message.content || "")
  }));

  const response = await ai.responses.create({
    model: config.model,
    instructions: buildInstructions(settings, kind),
    input,
    tools:
      useWeb && provider === "openai"
        ? [{ type: "web_search_preview" }]
        : undefined,
    stream: true
  });

  for await (const event of response) {
    if (event.type === "response.output_text.delta") {
      yield {
        text: event.delta
      };
    }

    if (
      event.type === "response.completed" &&
      event.response?.usage
    ) {
      yield {
        usageMetadata: event.response.usage
      };
    }
  }
}

export async function generateImage({
  prompt,
  imageFile
}) {
  const ai = getOpenAI();

  const input = [];

  input.push({
    type: "input_text",
    text: prompt
  });

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
      image_url:
        `data:${mimeType};base64,${buffer.toString("base64")}`
    });
  }

  return ai.images.generate({
    model:
      process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    prompt,
    size:
      process.env.OPENAI_IMAGE_SIZE || "1024x1024"
  });
}

export async function extractMemory() {
  return null;
}

export async function generateTitle(text) {
  const ai = getOpenAI();

  const response = await ai.responses.create({
    model:
      process.env.OPENAI_MODEL || "gpt-5.6-luna",
    input: `برای این گفتگو یک عنوان خیلی کوتاه فارسی بساز:\n${text}`,
    max_output_tokens: 30
  });

  return response.output_text?.trim() || "گفتگوی جدید";

}
