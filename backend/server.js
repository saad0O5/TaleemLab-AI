require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const { callVisionModel } = require("./lib/visionModel");
const { RECOGNITION_PROMPT, parseCircuitRecognitionResponse } = require("./lib/prompts");
const { solveCircuit } = require("./lib/circuitSolver");
const { parseCommand } = require("./lib/textCommandParser");
const { explainChange } = require("./lib/explanations");

const PORT = process.env.PORT || 3000;

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      // Protect against gigantic payloads (e.g. > 50MB)
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", err => reject(err));
  });
}

/**
 * Apply a modification to a component field on a copy of the circuit and solve
 * @param {object} circuit 
 * @param {string} componentId 
 * @param {string} field 
 * @param {any} newValue 
 * @returns {object} Solver output with rule-based explanation
 */
function applyCircuitChange(circuit, componentId, field, newValue) {
  if (!circuit || !Array.isArray(circuit.components)) {
    throw new Error("Invalid circuit payload: 'components' array is required.");
  }

  const targetComponent = circuit.components.find(c => c.id === componentId);
  if (!targetComponent) {
    const error = new Error(`Component '${componentId}' was not found in circuit.`);
    error.code = "component_not_found";
    throw error;
  }

  const oldValue = targetComponent[field];

  // Create deep copy of circuit to ensure immutability
  const updatedCircuit = {
    ...circuit,
    parallel_groups: circuit.parallel_groups ? circuit.parallel_groups.map(g => [...g]) : [],
    components: circuit.components.map(c => {
      if (c.id === componentId) {
        return { ...c, [field]: newValue };
      }
      return { ...c };
    })
  };

  const solverResult = solveCircuit(updatedCircuit);
  const explanation = explainChange(field, oldValue, newValue);

  return {
    ...solverResult,
    explanation
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  // Health check endpoint
  if (pathname === "/api/health" && req.method === "GET") {
    return sendJSON(res, 200, {
      status: "ok",
      app: "TaleemLab-AI",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_key_here")
    });
  }

  // POST /api/recognize-circuit
  if (pathname === "/api/recognize-circuit" && req.method === "POST") {
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
        rawResponse = await callVisionModel(imageBase64, RECOGNITION_PROMPT);
      } catch (visionErr) {
        return sendJSON(res, 500, {
          error: "vision_model_error",
          message: visionErr.message || "Failed to communicate with vision model"
        });
      }

      const parsedResult = parseCircuitRecognitionResponse(rawResponse);
      if (!parsedResult.success) {
        return sendJSON(res, 422, {
          error: "recognition_parse_failed",
          raw: parsedResult.raw
        });
      }

      return sendJSON(res, 200, parsedResult.data);
    } catch (err) {
      return sendJSON(res, 500, {
        error: "server_error",
        message: err.message
      });
    }
  }

  // POST /api/solve-circuit
  if (pathname === "/api/solve-circuit" && req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      const circuitData = body.circuit || body;

      if (!circuitData || !circuitData.components || !circuitData.topology) {
        return sendJSON(res, 400, {
          error: "invalid_circuit_payload",
          message: "Request body must be a valid circuit object containing 'topology' and 'components'."
        });
      }

      const result = solveCircuit(circuitData);
      return sendJSON(res, 200, result);
    } catch (err) {
      return sendJSON(res, 500, {
        error: "solver_error",
        message: err.message
      });
    }
  }

  // POST /api/apply-change
  if (pathname === "/api/apply-change" && req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      const { circuit, componentId, field, newValue } = body || {};

      if (!circuit || !circuit.components || !circuit.topology) {
        return sendJSON(res, 400, {
          error: "invalid_circuit_payload",
          message: "Request body must contain a valid 'circuit' object."
        });
      }

      if (!componentId || typeof componentId !== "string") {
        return sendJSON(res, 400, {
          error: "missing_component_id",
          message: "Request body must contain a string 'componentId'."
        });
      }

      if (!field || typeof field !== "string") {
        return sendJSON(res, 400, {
          error: "missing_field",
          message: "Request body must contain a string 'field' to update."
        });
      }

      if (newValue === undefined) {
        return sendJSON(res, 400, {
          error: "missing_new_value",
          message: "Request body must contain 'newValue'."
        });
      }

      const result = applyCircuitChange(circuit, componentId, field, newValue);
      return sendJSON(res, 200, result);
    } catch (err) {
      if (err.code === "component_not_found") {
        return sendJSON(res, 400, {
          error: "component_not_found",
          message: err.message
        });
      }
      return sendJSON(res, 500, {
        error: "apply_change_error",
        message: err.message
      });
    }
  }

  // POST /api/text-command
  if (pathname === "/api/text-command" && req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      const { circuit, text } = body || {};

      if (!circuit || !circuit.components || !circuit.topology) {
        return sendJSON(res, 400, {
          error: "invalid_circuit_payload",
          message: "Request body must contain a valid 'circuit' object."
        });
      }

      if (!text || typeof text !== "string") {
        return sendJSON(res, 400, {
          error: "missing_text",
          message: "Request body must contain a 'text' command string."
        });
      }

      const parsedCmd = parseCommand(text, circuit);
      if (!parsedCmd || parsedCmd.recognized === false) {
        return sendJSON(res, 200, { recognized: false });
      }

      const { componentId, field, newValue } = parsedCmd;
      const result = applyCircuitChange(circuit, componentId, field, newValue);
      return sendJSON(res, 200, result);
    } catch (err) {
      if (err.code === "component_not_found") {
        return sendJSON(res, 400, {
          error: "component_not_found",
          message: err.message
        });
      }
      return sendJSON(res, 500, {
        error: "text_command_error",
        message: err.message
      });
    }
  }

  // Serve Interactive Test UI for GET / or GET /index.html
  if (pathname === "/" || pathname === "/index.html") {
    const htmlPath = path.join(__dirname, "public", "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(htmlPath));
    }
  }

  // 404 Fallback
  sendJSON(res, 404, { error: "not_found", message: `Route ${req.method} ${pathname} not found.` });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ TaleemLab Backend Server running on http://localhost:${PORT}`);
    console.log(`- POST /api/recognize-circuit`);
    console.log(`- POST /api/solve-circuit`);
    console.log(`- POST /api/apply-change`);
    console.log(`- POST /api/text-command`);
    console.log(`- GET  /api/health`);
    console.log(`======================================================\n`);
  });
}

module.exports = server;
