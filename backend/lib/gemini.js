const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Generic Gemini wrapper — handles both text-only and vision (text + image) requests.
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

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const timeoutMs = options.timeoutMs || 30000;

  // Build content parts
  const parts = [];

  if (imageBase64) {
    // Vision mode: text + image
    let mimeType = "image/jpeg";
    let cleanBase64 = imageBase64;

    if (typeof imageBase64 === "string" && imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(
        /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/s
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

    parts.push(textPrompt);
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    });
  } else {
    // Text-only mode
    parts.push(textPrompt);
  }

  // Execute with timeout
  const resultPromise = model.generateContent(parts);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs)
  );

  const result = await Promise.race([resultPromise, timeoutPromise]);
  const response = await result.response;
  const text = response.text();

  // Retry once if response is empty
  if (!text || text.trim().length === 0) {
    const retryResult = await model.generateContent(parts);
    const retryResponse = await retryResult.response;
    return retryResponse.text();
  }

  return text;
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
