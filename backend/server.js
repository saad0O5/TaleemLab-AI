require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

// ─── Route handlers ──────────────────────────────────────────────────
const { handleHealth } = require("./routes/health");
const { handleRecognize } = require("./routes/recognize");
const { handleSolve } = require("./routes/solve");
const { handleApplyChange } = require("./routes/applyChange");
const { handleTextCommand } = require("./routes/textCommand");
const { handleExplainPrediction, handleLearningSummary, handleEvaluateStudent } = require("./routes/aiTutor");
const { handleAskAI } = require("./routes/askAI");

const PORT = process.env.PORT || 4000;

// ─── CORS Allowlist ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return "*";
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")) return origin;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return origin;
  return ALLOWED_ORIGINS[0] || "*";
}

// ─── Rate Limiting ───────────────────────────────────────────────────
// NOTE: In-memory rate limiting is ineffective on Vercel serverless (each cold
// start gets a fresh Map). For production, replace with Vercel KV or Upstash.
// Kept here for local development only.
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

// ─── Helpers ─────────────────────────────────────────────────────────

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": res._corsOrigin || ALLOWED_ORIGINS[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
  });
  res.end(JSON.stringify(data));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", err => reject(err));
  });
}

// ─── Auth middleware ──────────────────────────────────────────────────
// Simple bearer token check. Health endpoint is exempted.
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || "";

function checkAuth(req) {
  if (!API_AUTH_TOKEN) return true; // no token configured = skip auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === API_AUTH_TOKEN;
}

// ─── Shared context passed to every route handler ────────────────────
const helpers = { parseRequestBody, sendJSON };

// ─── Server ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  res._corsOrigin = getCorsOrigin(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": res._corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400"
    });
    return res.end();
  }

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return sendJSON(res, 429, {
      error: "rate_limit_exceeded",
      message: "Too many requests. Please wait a minute and try again."
    });
  }

  // Health check (exempt from auth)
  if (pathname === "/api/health" && req.method === "GET") {
    return handleHealth(req, res, helpers);
  }

  // Auth check for all other API routes
  if (pathname.startsWith("/api/") && !checkAuth(req)) {
    return sendJSON(res, 401, {
      error: "unauthorized",
      message: "Invalid or missing authentication token."
    });
  }

  // Route dispatch
  try {
    if (pathname === "/api/recognize-circuit" && req.method === "POST") {
      return await handleRecognize(req, res, helpers);
    }
    if (pathname === "/api/solve-circuit" && req.method === "POST") {
      return await handleSolve(req, res, helpers);
    }
    if (pathname === "/api/apply-change" && req.method === "POST") {
      return await handleApplyChange(req, res, helpers);
    }
    if (pathname === "/api/text-command" && req.method === "POST") {
      return await handleTextCommand(req, res, helpers);
    }
    if (pathname === "/api/explain-prediction" && req.method === "POST") {
      return await handleExplainPrediction(req, res, helpers);
    }
    if (pathname === "/api/learning-summary" && req.method === "POST") {
      return await handleLearningSummary(req, res, helpers);
    }
    if (pathname === "/api/evaluate-student" && req.method === "POST") {
      return await handleEvaluateStudent(req, res, helpers);
    }
    if (pathname === "/api/ask-ai" && req.method === "POST") {
      return await handleAskAI(req, res, helpers);
    }
  } catch (err) {
    console.error("Unhandled route error:", err);
    return sendJSON(res, 500, {
      error: "internal_error",
      message: "An internal error occurred. Please try again."
    });
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
    console.log(`TaleemLab Backend Server running on http://localhost:${PORT}`);
    console.log(`- POST /api/recognize-circuit`);
    console.log(`- POST /api/solve-circuit`);
    console.log(`- POST /api/apply-change`);
    console.log(`- POST /api/text-command`);
    console.log(`- POST /api/explain-prediction`);
    console.log(`- POST /api/learning-summary`);
    console.log(`- POST /api/evaluate-student`);
    console.log(`- POST /api/ask-ai`);
    console.log(`- GET  /api/health`);
    console.log(`Auth: ${API_AUTH_TOKEN ? "ENABLED" : "DISABLED (set API_AUTH_TOKEN env var)"}`);
    console.log(`======================================================\n`);
  });
}

module.exports = server;
