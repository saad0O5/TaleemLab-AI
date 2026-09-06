/**
 * GET /api/health — Health check endpoint (exempt from auth)
 */
function handleHealth(req, res, { sendJSON }) {
  return sendJSON(res, 200, {
    status: "ok",
    app: "TaleemLab-AI",
    geminiConfigured: Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_key_here"
    ),
  });
}

module.exports = { handleHealth };
