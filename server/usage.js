const DAY_MS = 24 * 60 * 60 * 1000;

function quota() {
  return Math.max(1000, Number(process.env.DAILY_TOKEN_QUOTA) || 200000);
}

/** Resets the rolling daily window if it has elapsed, then returns a snapshot. */
export function getUsage(userData) {
  const q = quota();
  const now = Date.now();
  if (!userData.usage || now - userData.usage.periodStart > DAY_MS) {
    userData.usage = { periodStart: now, tokensUsed: 0 };
  }
  const remaining = Math.max(0, q - userData.usage.tokensUsed);
  const percent = Math.max(0, Math.min(100, Math.round((remaining / q) * 100)));
  return {
    tokensUsed: userData.usage.tokensUsed,
    quota: q,
    remaining,
    percent,
    resetAt: userData.usage.periodStart + DAY_MS
  };
}

export function addUsage(userData, tokens) {
  getUsage(userData); // ensure the window is fresh before adding
  userData.usage.tokensUsed += Math.max(0, Math.round(tokens));
}

/** Best-effort token count for a Gemini stream: prefer real usageMetadata, fall back to a char estimate. */
export function estimateTokens({ usageMetadata, promptText = "", outputText = "" }) {
  if (usageMetadata?.totalTokenCount) return usageMetadata.totalTokenCount;
  const approxChars = promptText.length + outputText.length;
  return Math.max(1, Math.ceil(approxChars / 4)); // ~4 chars per token, a standard rough estimate
}
