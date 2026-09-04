require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const { callGemini } = require("./lib/gemini");
const { generateTutorResponse, generateLearningSummary, generateEvaluation } = require("./lib/aiTutor");
const { RECOGNITION_PROMPT, parseCircuitRecognitionResponse } = require("./lib/prompts");
const { solveCircuit, SANITY_LIMITS } = require("./lib/circuitSolver");
const { parseCommand } = require("./lib/textCommandParser");
const { explainChange } = require("./lib/explanations");

const PORT = process.env.PORT || 3000;

// ─── CORS Allowlist ──────────────────────────────────────────────────
// Set ALLOWED_ORIGINS as a comma-separated list in .env (e.g. "http://localhost:3000,https://taleemlab.vercel.app")
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0] || '*';
}

// ─── Rate Limiting ───────────────────────────────────────────────────
// Simple in-memory rate limiter: 30 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    entry = { start: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": res._corsOrigin || ALLOWED_ORIGINS[0] || '*',
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      // Protect against oversized payloads (e.g. > 10MB — images are typically 2-8MB)
      if (body.length > 10 * 1024 * 1024) {
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

  // Solve the original circuit to get the old current for context
  const originalResult = solveCircuit(circuit);
  const oldCurrent = originalResult.current;

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
  const newCurrent = solverResult.current;
  const explanation = explainChange(field, oldValue, newValue, { oldCurrent, newCurrent });

  return {
    ...solverResult,
    explanation
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

  // Set CORS origin for this response
  res._corsOrigin = getCorsOrigin(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": res._corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400"
    });
    return res.end();
  }

  // Rate limiting (skip for health check and OPTIONS)
  if (!checkRateLimit(clientIp)) {
    return sendJSON(res, 429, {
      error: "rate_limit_exceeded",
      message: "Too many requests. Please wait a minute and try again."
    });
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
        rawResponse = await callGemini(RECOGNITION_PROMPT, imageBase64);
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

      // Validate schema before passing to solver
      const data = parsedResult.data;
      const validTopologies = ["series", "series_parallel"];
      const validTypes = ["battery", "resistor", "switch", "bulb", "ammeter", "voltmeter"];
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
            message: `Invalid component: ${JSON.stringify(c)}. Type must be one of: ${validTypes.join(', ')}.`
          });
        }
        if (!Array.isArray(c.connects_to)) {
          c.connects_to = []; // auto-fix missing connects_to
        }
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

      // Validate against SANITY_LIMITS before solving
      if (field === 'resistance') {
        const numVal = Number(newValue);
        if (isNaN(numVal)) {
          return sendJSON(res, 400, {
            error: "invalid_value",
            message: "Resistance must be a number."
          });
        }
        if (numVal < SANITY_LIMITS.resistance.min) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "Resistance can't be negative — resistors always oppose current flow, they can't push it."
          });
        }
        if (numVal > SANITY_LIMITS.resistance.max) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "That's higher than this simulator supports — try a value under 10,000 ohms."
          });
        }
      }
      if (field === 'voltage') {
        const numVal = Number(newValue);
        if (isNaN(numVal)) {
          return sendJSON(res, 400, {
            error: "invalid_value",
            message: "Voltage must be a number."
          });
        }
        if (numVal < SANITY_LIMITS.voltage.min) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "Voltage can't be negative in this simulator — it represents the battery's push, always positive here."
          });
        }
        if (numVal > SANITY_LIMITS.voltage.max) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "That's higher than a typical classroom circuit — try a value under 100 volts."
          });
        }
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

      // Validate against SANITY_LIMITS before solving
      if (field === 'resistance') {
        const numVal = Number(newValue);
        if (isNaN(numVal)) {
          return sendJSON(res, 400, {
            error: "invalid_value",
            message: "Resistance must be a number."
          });
        }
        if (numVal < SANITY_LIMITS.resistance.min) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "Resistance can't be negative — resistors always oppose current flow, they can't push it."
          });
        }
        if (numVal > SANITY_LIMITS.resistance.max) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "That's higher than this simulator supports — try a value under 10,000 ohms."
          });
        }
      }
      if (field === 'voltage') {
        const numVal = Number(newValue);
        if (isNaN(numVal)) {
          return sendJSON(res, 400, {
            error: "invalid_value",
            message: "Voltage must be a number."
          });
        }
        if (numVal < SANITY_LIMITS.voltage.min) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "Voltage can't be negative in this simulator — it represents the battery's push, always positive here."
          });
        }
        if (numVal > SANITY_LIMITS.voltage.max) {
          return sendJSON(res, 400, {
            error: "value_out_of_bounds",
            message: "That's higher than a typical classroom circuit — try a value under 100 volts."
          });
        }
      }

      const result = applyCircuitChange(circuit, componentId, field, newValue);
      return sendJSON(res, 200, {
        ...result,
        appliedChange: { componentId, field, newValue }
      });
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

  // POST /api/explain-prediction
  if (pathname === "/api/explain-prediction" && req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      const {
        predictionKey, direction, studentAnswer, correct,
        oldValue, newValue, oldCurrent, newCurrent, studentProfile
      } = body || {};

      if (!predictionKey || !direction || !studentAnswer) {
        return sendJSON(res, 400, {
          error: "missing_fields",
          message: "Request must contain predictionKey, direction, studentAnswer, correct."
        });
      }

      const aiResponse = await generateTutorResponse({
        predictionKey, direction, studentAnswer,
        correct: Boolean(correct),
        oldValue, newValue, oldCurrent, newCurrent,
        studentProfile: studentProfile || {}
      });

      if (aiResponse) {
        return sendJSON(res, 200, { ...aiResponse, isAI: true });
      }

      // Fallback: rule-based explanation
      const { explainChange } = require("./lib/explanations");
      const field = predictionKey === "state" ? "state" : predictionKey;
      const fallbackText = explainChange(field, oldValue, newValue, { oldCurrent, newCurrent });
      return sendJSON(res, 200, {
        headline: correct ? "You got it!" : "Not quite",
        explanation: fallbackText,
        followUp: "",
        insight: "",
        isAI: false
      });
    } catch (err) {
      return sendJSON(res, 500, {
        error: "explain_error",
        message: err.message
      });
    }
  }

  // POST /api/learning-summary
  if (pathname === "/api/learning-summary" && req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      const studentProfile = body?.studentProfile || body || {};

      const aiSummary = await generateLearningSummary(studentProfile);

      if (aiSummary) {
        return sendJSON(res, 200, { ...aiSummary, isAI: true });
      }

      // Fallback: generic encouragement
      const total = studentProfile.totalPredictions || 0;
      const accuracy = studentProfile.accuracy ? Math.round(studentProfile.accuracy * 100) : 0;
      return sendJSON(res, 200, {
        summary: total > 0
          ? `You've made ${total} predictions with ${accuracy}% accuracy. Keep experimenting to build your understanding!`
          : "Start making predictions to see your personalized learning summary here.",
        isAI: false
      });
    } catch (err) {
      return sendJSON(res, 500, {
        error: "summary_error",
        message: err.message
      });
    }
  }

  // POST /api/evaluate-student
  if (pathname === "/api/evaluate-student" && req.method === "POST") {
    try {
      const body = await parseRequestBody(req);
      const studentProfile = body?.studentProfile || body || {};

      const evaluation = await generateEvaluation(studentProfile);

      if (evaluation) {
        return sendJSON(res, 200, { ...evaluation, isAI: true });
      }

      // Fallback: rule-based evaluation
      const total = studentProfile.totalPredictions || 0;
      const accuracy = studentProfile.accuracy ? Math.round(studentProfile.accuracy * 100) : 0;
      const conceptAcc = studentProfile.conceptAccuracy || {};
      const misconceptions = (studentProfile.topMisconceptions || []).map(m => ({
        label: m.label,
        explanation: `${m.label}: ${m.description}. This is a common misunderstanding — keep experimenting to build intuition.`
      }));
      const recommendations = [];
      if (accuracy < 50) recommendations.push("Focus on the basics — try changing one variable at a time and observe what happens to the current.");
      else if (accuracy < 80) recommendations.push("You're getting there! Try predicting before each change to strengthen your understanding.");
      else recommendations.push("Great accuracy! Challenge yourself with more complex circuits and parallel arrangements.");
      if (misconceptions.length > 0) recommendations.push(`Work on your understanding of: ${misconceptions.map(m => m.label).join(", ")}.`);
      if (total < 5) recommendations.push("Make more predictions to get a detailed AI evaluation.");

      return sendJSON(res, 200, {
        overallAssessment: total > 0
          ? `You've made ${total} predictions with ${accuracy}% accuracy. ${accuracy >= 80 ? 'Strong understanding!' : accuracy >= 50 ? 'Developing understanding — keep going!' : 'Early stages — every experiment builds your knowledge.'}`
          : "Make some predictions in the lab to get your personalized AI evaluation.",
        conceptAnalysis: Object.entries(conceptAcc).map(([concept, acc]) => ({
          concept,
          level: acc >= 0.8 ? "strong" : acc >= 0.5 ? "developing" : "needs_work",
          analysis: `${concept}: ${Math.round(acc * 100)}% accuracy. ${acc >= 0.8 ? 'Good grasp!' : 'Needs more practice.'}`
        })),
        misconceptions,
        recommendations,
        encouragement: total > 0 ? "Keep experimenting — every prediction builds your understanding!" : "Start making predictions to unlock your full evaluation.",
        isAI: false
      });
    } catch (err) {
      return sendJSON(res, 500, {
        error: "evaluation_error",
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
    console.log(`- POST /api/explain-prediction`);
    console.log(`- POST /api/learning-summary`);
    console.log(`- GET  /api/health`);
    console.log(`======================================================\n`);
  });
}

module.exports = server;
