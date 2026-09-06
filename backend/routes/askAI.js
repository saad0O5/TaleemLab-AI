/**
 * POST /api/ask-ai — Answer any question about the current circuit
 *
 * Accepts: { question: string, circuitContext: object }
 * Returns: { answer: string }
 *
 * This endpoint lets students ask ANY question about their circuit
 * and get an AI-powered contextual answer.
 */
const { callGemini, parseJsonResponse } = require("../lib/gemini");

function buildAskPrompt(question, circuitContext) {
  const {
    voltage,
    current,
    totalResistance,
    closed,
    components,
    topology,
  } = circuitContext || {};

  const componentList = Array.isArray(components)
    ? components
        .map(
          (c) =>
            `${c.id} (${c.type}${c.voltage ? `, ${c.voltage}V` : ""}${c.resistance ? `, ${c.resistance}Ω` : ""}${c.state ? `, ${c.state}` : ""})`
        )
        .join(", ")
    : "none";

  return `You are a friendly, encouraging physics tutor for Grade 9-10 students. Use SIMPLE English, short sentences, and everyday analogies. The student is experimenting with a DC circuit and has a question.

## Current circuit state
- Topology: ${topology || "series"}
- Switch: ${closed ? "CLOSED (current flowing)" : "OPEN (no current)"}
- Total voltage: ${voltage ?? "?"}V
- Total current: ${current ?? "?"}A
- Total resistance: ${totalResistance ?? "?"}Ω
- Components: ${componentList}

## Student's question
"${question}"

## Response rules
- Answer in 2-4 simple sentences
- Reference the ACTUAL values from the circuit above (not generic values)
- Use a real-world analogy when helpful (water pipes, pumps, roads, drawbridges)
- If the question is about something not in the circuit, briefly explain and relate it back to what they have
- If the question is unclear, give your best interpretation
- End with a suggestion of something they can try with the sliders or switch to explore further

Return ONLY valid JSON (no markdown, no text outside JSON):
{
  "answer": "Your 2-4 sentence answer here. Simple English. Reference actual circuit values.",
  "tryThis": "One specific thing they can try next to explore this further"
}`;
}

async function handleAskAI(req, res, { parseRequestBody, sendJSON }) {
  try {
    const body = await parseRequestBody(req);
    const question = (body.question || "").trim();

    if (!question) {
      return sendJSON(res, 400, {
        error: "missing_question",
        message: "Please provide a question."
      });
    }

    if (question.length > 200) {
      return sendJSON(res, 400, {
        error: "question_too_long",
        message: "Please keep your question under 200 characters."
      });
    }

    let rawText;
    try {
      rawText = await callGemini(
        buildAskPrompt(question, body.circuitContext),
        null,
        { timeoutMs: 15000 }
      );
    } catch (err) {
      console.warn("Ask AI error:", err.message);
      return sendJSON(res, 500, {
        error: "ai_error",
        message: "The AI tutor is busy right now. Try again in a moment."
      });
    }

    const parsed = parseJsonResponse(rawText);
    if (!parsed.success || !parsed.data?.answer) {
      return sendJSON(res, 422, {
        error: "parse_failed",
        message: "Could not understand the AI response. Please try rephrasing."
      });
    }

    return sendJSON(res, 200, {
      answer: parsed.data.answer,
      tryThis: parsed.data.tryThis || "",
    });
  } catch (err) {
    console.error("Ask AI route error:", err);
    return sendJSON(res, 500, {
      error: "server_error",
      message: "An internal error occurred. Please try again."
    });
  }
}

module.exports = { handleAskAI };
