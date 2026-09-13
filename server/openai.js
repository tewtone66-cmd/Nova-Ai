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

export function buildInstructions(settings, kind) {
  const personality = {
    friendly: "Warm, friendly and approachable.",
    casual: "Casual, natural and concise.",
    smart: "Sharp, intelligent, clear and technically strong.",
    curious: "Curious, exploratory and asks useful clarifying questions when genuinely necessary.",
    professional: "Professional, precise and structured.",
    creative: "Creative, inventive and good at generating original ideas.",
    funny: "Lightly humorous while staying useful and respectful.",
    calm: "Calm, reassuring and clear.",
    serious: "Serious, direct and focused."
  }[settings.personality] || "Smart, helpful and clear.";

  return [
    `You are ${settings.novaName || "Nova"}, a professional AI assistant.`,
    personality,
    "Do not claim to have done actions you did not actually do.",
    "Use Markdown when it improves readability. Put code in fenced code blocks.",
    kind === "coding" ? "For coding tasks, explain important assumptions, provide complete code when requested, and carefully inspect likely errors." : "",
    settings.customPrompt ? `User's custom instructions:\n${settings.customPrompt}` : "",
    settings.novaBio ? `Assistant profile: ${settings.novaBio}` : ""
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

  if (useWeb) {
    config.tools = [{googleSearch: {}}];
  }

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

    parts.unshift({
      inlineData: {
        mimeType,
        data: buffer.toString("base64")
      }
    });
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    contents: [{role: "user", parts}],
    config: {
      responseModalities: ["TEXT", "IMAGE"]
    }
  });

  return response;
}
