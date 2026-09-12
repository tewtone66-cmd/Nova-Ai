import OpenAI from "openai";

let client;
function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  client ??= new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  return client;
}

export function modelFor(kind="text") {
  if (kind === "coding") return process.env.OPENAI_CODING_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-luna";
  return process.env.OPENAI_MODEL || "gpt-5.6-luna";
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
  const client = getClient();
  const input = messages.map(m => ({role:m.role, content:m.content}));
  const params = {
    model: modelFor(kind),
    instructions: buildInstructions(settings, kind),
    input,
    stream: true
  };
  if (useWeb) params.tools = [{type:"web_search_preview"}];
  return client.responses.create(params, {signal});
}

export async function generateImage({prompt, imageFile, size="1024x1024"}) {
  const client = getClient();
  if (imageFile) {
    const fs = await import("node:fs");
    const buffer = fs.readFileSync(imageFile);
    const file = new File([buffer], imageFile.split("/").pop(), {type:"image/png"});
    const result = await client.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      image: file,
      prompt,
      size
    });
    return result;
  }
  return client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    prompt,
    size
  });
}
