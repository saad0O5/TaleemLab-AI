const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Isolated Vision Model Caller
 * Calls Gemini's vision-capable model with the provided image and prompt.
 * Returns the raw text response.
 * 
 * To switch providers (e.g. to Alibaba Qwen-VL), only rewrite this function.
 *
 * @param {string} imageBase64 - Base64 encoded image string or data URL
 * @param {string} prompt - Text prompt for the vision model
 * @returns {Promise<string>} Raw text response from the model
 */
async function callVisionModel(imageBase64, prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set a valid Gemini API key in your .env file."
    );
  }

  let mimeType = "image/jpeg";
  let cleanBase64 = imageBase64;

  if (typeof imageBase64 === "string" && imageBase64.startsWith("data:")) {
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/s);
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

  // Remove any whitespace or newline characters from the base64 string
  cleanBase64 = cleanBase64.trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const imagePart = {
    inlineData: {
      data: cleanBase64,
      mimeType: mimeType
    }
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text();
}

module.exports = { callVisionModel };
