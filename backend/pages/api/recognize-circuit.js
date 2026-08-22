const { callVisionModel } = require("../../lib/visionModel");
const { RECOGNITION_PROMPT, parseCircuitRecognitionResponse } = require("../../lib/prompts");

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb"
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { image, imageBase64 } = req.body || {};
    const imgData = imageBase64 || image;

    if (!imgData) {
      return res.status(400).json({
        error: "missing_image",
        message: "Request body must contain 'imageBase64' or 'image' field with base64 data."
      });
    }

    let rawResponse;
    try {
      rawResponse = await callVisionModel(imgData, RECOGNITION_PROMPT);
    } catch (modelErr) {
      return res.status(500).json({
        error: "vision_model_error",
        message: modelErr.message || "Failed to communicate with vision model"
      });
    }

    const parseResult = parseCircuitRecognitionResponse(rawResponse);
    if (!parseResult.success) {
      return res.status(422).json({
        error: "recognition_parse_failed",
        raw: parseResult.raw
      });
    }

    return res.status(200).json(parseResult.data);
  } catch (err) {
    return res.status(500).json({
      error: "internal_server_error",
      message: err.message
    });
  }
}
