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

  // NOTE: model ids must be REAL, currently-served Gemini models. gemini-3.6-flash
  // is the current default for this account; older ids like gemini-2.0-flash /
  // gemini-1.5-flash are retired and return 404. Configurable via GEMINI_MODEL;
  // we always try a couple of stable fallbacks if the configured one is unavailable.
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

  const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];
  const MAX_RETRIES = 2;
  const modelsToTry = [modelName, ...FALLBACK_MODELS.filter(m => m !== modelName)];
  let lastError = "";

  for (const model of modelsToTry) {
    // API key sent via header (Google's preferred method) — NOT in URL
    const tryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Backoff before retries: ~0.5s, 1s (capped) + jitter. Google's 503 "high
      // demand" responses are explicitly temporary, so a short bounded backoff
      // rides out a brief spike without letting the UI hang for tens of seconds.
      if (attempt > 0) {
        const delay = Math.min(3000, 500 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(tryUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        // A slow/aborted request under load is retryable — don't hard-fail on the
        // first blip; only surface the error once the retry budget is spent.
        lastError = err.name === "AbortError" ? "request timed out" : `network error: ${err.message}`;
        if (attempt < MAX_RETRIES) {
          console.warn(`Gemini ${model} ${lastError}, retrying (${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        throw new Error(
          err.name === "AbortError"
            ? "Gemini request timed out"
            : `Gemini network error: ${err.message}`
        );
      }
      clearTimeout(timer);

      // Retryable errors: 503 (high demand), 429 (rate limit), 500 (server error)
      if (response.status === 503 || response.status === 429 || response.status === 500) {
        const errText = await response.text().catch(() => "");
        lastError = `${response.status}: ${errText.substring(0, 160)}`;
        if (attempt < MAX_RETRIES) {
          console.warn(`Gemini ${model} returned ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`);
          continue;
        }
        // Exhausted retries on this model — try fallback model
        break;
      }


      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        // Non-retryable for THIS model (bad/unsupported id, or model not served)
        // → try the next candidate model instead of failing immediately.
        if (response.status === 404 || response.status === 400) {
          console.warn(`Gemini model ${model} unavailable (${response.status}), trying fallback...`);
          lastError = `${response.status}: ${errText.substring(0, 160)}`;
          break;
        }
        // Auth/access problems (401/403) — record and keep trying fallbacks,
        // then surface one clear, actionable message after all models fail.
        if (response.status === 401 || response.status === 403) {
          console.warn(`Gemini rejected request for ${model} (${response.status}). Check GEMINI_API_KEY / project access.`);
          lastError = `${response.status} (access denied): ${errText.substring(0, 160)}`;
          break;
        }
        lastError = `${response.status}: ${errText.substring(0, 200)}`;
        break;
      }

      const data = await response.json();

      // Extract text from response
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "";

      // Approximate token count from usage metadata
      const approxTokens = data?.usageMetadata?.totalTokenCount || Math.ceil((text.length || 100) / 4);

      // Retry once if response is empty
      if (!text || text.trim().length === 0) {
        const retryResponse = await fetch(tryUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body,
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryText = retryData?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "";
          if (retryText) {
            trackUsage(model, retryData?.usageMetadata?.totalTokenCount || Math.ceil(retryText.length / 4));
            return retryText;
          }
        }
      }

      if (text) {
        trackUsage(model, approxTokens);
        return text;
      }
    }
  }

  throw new Error(
    `All Gemini models unavailable (${modelsToTry.join(", ")}).` +
    (lastError ? ` Last error — ${lastError}` : "") +
    " Verify GEMINI_API_KEY and that GEMINI_MODEL is a real, currently-served model."
  );
}

// ─── Basic usage tracking ────────────────────────────────────────────
let dailyCallCount = 0;
let dailyCallDate = new Date().toISOString().slice(0, 10);
const DAILY_WARN_THRESHOLD = 100; // warn when exceeding this many calls/day

function trackUsage(model, approxTokens) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyCallDate) {
    dailyCallCount = 0;
    dailyCallDate = today;
  }
  dailyCallCount++;
  console.log(`[Gemini] model=${model} calls_today=${dailyCallCount} approx_tokens=${approxTokens}`);
  if (dailyCallCount === DAILY_WARN_THRESHOLD) {
    console.warn(`[Gemini] Daily call threshold reached (${DAILY_WARN_THRESHOLD}). Monitor usage.`);
  }
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

module.exports = { callGemini, parseJsonResponse, trackUsage };
