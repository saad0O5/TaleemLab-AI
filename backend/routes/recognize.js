/**
 * POST /api/recognize-circuit — Vision-based circuit recognition via Gemini
 */
const { callGemini } = require("../lib/gemini");
const { RECOGNITION_PROMPT, parseCircuitRecognitionResponse } = require("../lib/prompts");

async function handleRecognize(req, res, { parseRequestBody, sendJSON }) {
  try {
    const body = await parseRequestBody(req);
    const imageBase64 = body.imageBase64 || body.image;

    if (!imageBase64) {
      return sendJSON(res, 400, {
        error: "missing_image",
        message: "Request body must contain 'imageBase64' or 'image' field."
      });
    }

    let rawResponse;
    try {
      rawResponse = await callGemini(RECOGNITION_PROMPT, imageBase64);
    } catch (visionErr) {
      console.error("Vision model error:", visionErr.message);
      return sendJSON(res, 500, {
        error: "vision_model_error",
        message: "Failed to communicate with vision model. Please try again."
      });
    }

    const parsedResult = parseCircuitRecognitionResponse(rawResponse);
    if (!parsedResult.success) {
      return sendJSON(res, 422, {
        error: "recognition_parse_failed",
        message: "Could not parse the circuit recognition result. Please try a clearer image."
      });
    }

    // Validate schema before passing to solver
    const data = parsedResult.data;
    const validTopologies = ["series", "series_parallel"];
    const validTypes = ["battery", "resistor", "switch", "bulb", "ammeter", "voltmeter", "capacitor", "diode"];

    if (!data.topology || !validTopologies.includes(data.topology)) {
      return sendJSON(res, 422, {
        error: "recognition_invalid_topology",
        message: `Topology must be 'series' or 'series_parallel', got '${data.topology}'.`
      });
    }

    if (!Array.isArray(data.components) || data.components.length === 0) {
      return sendJSON(res, 422, {
        error: "recognition_no_components",
        message: "No components were recognized in the image."
      });
    }

    for (const c of data.components) {
      // Normalize IDs to lowercase to prevent case mismatch with text parser
      c.id = c.id.toLowerCase();
      if (!c.id || !c.type || !validTypes.includes(c.type)) {
        return sendJSON(res, 422, {
          error: "recognition_invalid_component",
          message: `Invalid component detected. Type must be one of: ${validTypes.join(", ")}.`
        });
      }
      if (!Array.isArray(c.connects_to)) {
        c.connects_to = []; // auto-fix missing connects_to
      }
    }

    return sendJSON(res, 200, parsedResult.data);
  } catch (err) {
    console.error("Recognize route error:", err);
    return sendJSON(res, 500, {
      error: "server_error",
      message: "An internal error occurred. Please try again."
    });
  }
}

module.exports = { handleRecognize };
