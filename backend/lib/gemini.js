/**
 * Generic Gemini wrapper — uses the REST API directly (no SDK dependency).
 * Handles both text-only and vision (text + image) requests.
 *
 * @param {string} textPrompt - The text prompt to send
 * @param {string|null} [imageBase64] - Optional base64 image or data URL for vision mode
 * @param {object} [options] - Optional settings
 * @param {number} [options.timeoutMs] - Request timeout in ms (default: 30000)
 * @returns {Promise<string>} Raw text response from Gemini
 */
async function callGemini(textPrompt, imageBase64 = null, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set a valid Gemini API key in your .env file."
    );
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const timeoutMs = options.timeoutMs || 30000;

  // Build content parts
  const parts = [];

  if (imageBase64) {
    // Vision mode: text + image
    let mimeType = "image/jpeg";
    let cleanBase64 = imageBase64;

    if (typeof imageBase64 === "string" && imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(
        /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.*)$/s
      );
      if (matches) {
        mimeType = matches[1];
        cleanBase64 = matches[2];
      } else {
        const commaIndex = imageBase64.indexOf(",");
        if (commaIndex !== -1) {
          const meta = imageBase64.substring(5, commaIndex);
          if (meta.includes(";base64")) {
            mimeType = meta.split(";")[0] || mimeType;
          }
          cleanBase64 = imageBase64.substring(commaIndex + 1);
        }
      }
    }

    cleanBase64 = cleanBase64.trim();

    parts.push({ text: textPrompt });
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    });
  } else {
    // Text-only mode
    parts.push({ text: textPrompt });
  }

  const body = JSON.stringify({
    contents: [{ parts }],
  });

  const FALLBACK_MODELS = [];
  const MAX_RETRIES = 2;
  const modelsToTry = [modelName, ...FALLBACK_MODELS.filter(m => m !== modelName)];

  for (const model of modelsToTry) {
    const tryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Backoff: 1s, 2s, 4s
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(tryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          throw new Error("Gemini request timed out");
        }
        throw new Error(`Gemini network error: ${err.message}`);
      }
      clearTimeout(timer);

      // Retryable errors: 503 (unavailable), 429 (rate limit), 500 (server error)
      if (response.status === 503 || response.status === 429 || response.status === 500) {
        if (attempt < MAX_RETRIES) {
          console.warn(`Gemini ${model} returned ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        // Exhausted retries on this model — try fallback model
        break;
      }

      if (!response.ok) {
        // Non-retryable error (404, 401, etc.) — try next model
        if (response.status === 404) {
          console.warn(`Gemini model ${model} not found, trying fallback...`);
          break;
        }
        const errText = await response.text().catch(() => "");
        throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();

      // Extract text from response
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "";

      // Retry once if response is empty
      if (!text || text.trim().length === 0) {
        const retryResponse = await fetch(tryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryText = retryData?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "";
          if (retryText) return retryText;
        }
      }

      if (text) return text;
    }
  }

  throw new Error("All Gemini models unavailable — please try again later.");
}

/**
 * Strip markdown code fences from a Gemini response and parse as JSON.
 *
 * @param {string} rawText - Raw text that should contain JSON (possibly fenced)
 * @returns {{ success: boolean, data?: object, raw: string, error?: string }}
 */
function parseJsonResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, error: "empty_response", raw: String(rawText) };
  }

  let cleaned = rawText.trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Also check for fences embedded in surrounding text
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed, raw: rawText };
  } catch (err) {
    return {
      success: false,
      error: "json_parse_failed",
      raw: rawText,
      message: err.message,
    };
  }
}

module.exports = { callGemini, parseJsonResponse };
