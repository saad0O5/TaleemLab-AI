const { callGemini, parseJsonResponse } = require("./gemini");

// ─── Tutor Prompt ─────────────────────────────────────────────────────

function buildTutorPrompt(input) {
  const {
    predictionKey,
    direction,
    studentAnswer,
    correct,
    oldValue,
    newValue,
    oldCurrent,
    newCurrent,
    studentProfile,
  } = input;

  const conceptLabel =
    predictionKey === "state" ? "switch" : predictionKey;
  const directionWord = direction === "up" ? "increased" : "decreased";
  const unit = predictionKey === "voltage" ? "V" : predictionKey === "resistance" ? "Ω" : "";
  const currentUnit = "A";

  // Format student profile for the prompt
  const accuracy = studentProfile?.accuracy
    ? `${Math.round(studentProfile.accuracy * 100)}%`
    : "unknown";
  const conceptAcc = studentProfile?.conceptAccuracy
    ? Object.entries(studentProfile.conceptAccuracy)
        .map(([k, v]) => `${k}: ${Math.round(v * 100)}%`)
        .join(", ")
    : "none yet";
  const topMisc = studentProfile?.topMisconceptions?.length
    ? studentProfile.topMisconceptions
        .map(
          (m) =>
            `"${m.label}" (${Math.round(m.confidence * 100)}% confidence — ${m.description})`
        )
        .join("; ")
    : "none detected";
  const streak = studentProfile?.recentStreak || "no recent pattern";
  const total = studentProfile?.totalPredictions || 0;

  return `You are a friendly, encouraging science tutor for Grade 9-10 students in Punjab, Pakistan. The student has limited English fluency, so use SIMPLE English, short sentences (max 3-4 sentences for explanation), and everyday analogies. Never use complex vocabulary.

A student just made a prediction about a DC circuit experiment. You must respond to their prediction.

## What happened
- The student ${directionWord} the ${conceptLabel} from ${oldValue}${unit} to ${newValue}${unit}
- Current changed from ${oldCurrent?.toFixed(4) || "?"}${currentUnit} to ${newCurrent?.toFixed(4) || "?"}${currentUnit}
- The student predicted current would go: ${studentAnswer}
- They were: ${correct ? "CORRECT" : "WRONG"}

## About this student
- Total predictions made: ${total}
- Overall accuracy: ${accuracy}
- Per-concept accuracy: ${conceptAcc}
- Detected misconceptions: ${topMisc}
- Recent pattern: ${streak}

## Your response rules
${
  correct
    ? `- Celebrate briefly (one short sentence)
- Explain WHY they were right in 1-2 simple sentences using an analogy if helpful
- Then give a follow-up CHALLENGE question that pushes their understanding further (something they can try next with the sliders/switch)`
    : `- Be kind — say "Not quite" or "Close, but not exactly"
- Explain the correct answer in 2-3 simple sentences
- Use a real-world analogy (water pipe for resistance, water pump for voltage, drawbridge/road for switch)
- If a misconception is detected for this concept, NAME it in friendly language: "You might be thinking that..." and explain why that's not quite right
- Do NOT give a follow-up challenge — instead give a simple tip to remember`
}

## Response format
Return ONLY valid JSON (no markdown, no explanation text outside JSON):
{
  "headline": "${correct ? "You got it!" : "Not quite"}",
  "explanation": "Your 2-3 sentence explanation here. Simple English. Use analogies.",
  "followUp": "${correct ? "A specific challenge question they can try next" : "A simple tip or analogy to remember this"}",
  "insight": "One sentence about their learning progress based on their profile data"
}`;
}

// ─── Learning Summary Prompt ──────────────────────────────────────────

function buildSummaryPrompt(studentProfile) {
  const accuracy = studentProfile?.accuracy
    ? `${Math.round(studentProfile.accuracy * 100)}%`
    : "unknown";
  const conceptAcc = studentProfile?.conceptAccuracy
    ? Object.entries(studentProfile.conceptAccuracy)
        .map(([k, v]) => `${k}: ${Math.round(v * 100)}% correct`)
        .join(", ")
    : "no data";
  const topMisc = studentProfile?.topMisconceptions?.length
    ? studentProfile.topMisconceptions
        .map((m) => `"${m.label}" (${Math.round(m.confidence * 100)}%)`)
        .join(", ")
    : "none";
  const total = studentProfile?.totalPredictions || 0;

  return `You are a friendly science tutor summarizing a student's learning progress in a DC circuits experiment. The student is Grade 9-10 in Punjab, Pakistan with limited English. Use simple, encouraging language.

## Student data
- Total predictions: ${total}
- Overall accuracy: ${accuracy}
- Per-concept: ${conceptAcc}
- Active misconceptions: ${topMisc}

Write a 2-3 sentence personalized learning summary that:
1. Acknowledges what they've been working on
2. Notes their progress (improving, struggling, or strong)
3. Suggests what to focus on next

Return ONLY valid JSON (no markdown):
{
  "summary": "Your 2-3 sentence summary here"
}`;
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Generate a personalized tutor response after a prediction.
 * Falls back to null on failure (caller should use rule-based explanation).
 *
 * @param {object} input - Prediction details + student profile
 * @returns {Promise<{ headline: string, explanation: string, followUp: string, insight: string } | null>}
 */
async function generateTutorResponse(input) {
  try {
    const prompt = buildTutorPrompt(input);
    const rawText = await callGemini(prompt, null, { timeoutMs: 15000 });
    const parsed = parseJsonResponse(rawText);

    if (!parsed.success || !parsed.data) return null;

    const d = parsed.data;
    // Validate required fields
    if (!d.explanation) return null;

    return {
      headline: d.headline || (input.correct ? "You got it!" : "Not quite"),
      explanation: d.explanation,
      followUp: d.followUp || "",
      insight: d.insight || "",
    };
  } catch (err) {
    console.warn("AI tutor response failed:", err.message);
    return null;
  }
}

/**
 * Generate a learning summary for the progress page.
 * Falls back to null on failure.
 *
 * @param {object} studentProfile - Student learning profile
 * @returns {Promise<{ summary: string } | null>}
 */
async function generateLearningSummary(studentProfile) {
  try {
    const prompt = buildSummaryPrompt(studentProfile);
    const rawText = await callGemini(prompt, null, { timeoutMs: 15000 });
    const parsed = parseJsonResponse(rawText);

    if (!parsed.success || !parsed.data || !parsed.data.summary) return null;

    return { summary: parsed.data.summary };
  } catch (err) {
    console.warn("AI learning summary failed:", err.message);
    return null;
  }
}

// ─── Evaluation Prompt ───────────────────────────────────────────────

function buildEvaluationPrompt(studentProfile) {
  const accuracy = studentProfile?.accuracy
    ? `${Math.round(studentProfile.accuracy * 100)}%`
    : "unknown";
  const conceptAcc = studentProfile?.conceptAccuracy
    ? Object.entries(studentProfile.conceptAccuracy)
        .map(([k, v]) => `${k}: ${Math.round(v * 100)}% correct`)
        .join(", ")
    : "no data";
  const topMisc = studentProfile?.topMisconceptions?.length
    ? studentProfile.topMisconceptions
        .map((m) => `"${m.label}" (${Math.round(m.confidence * 100)}% confidence — ${m.description})`)
        .join("; ")
    : "none detected";
  const total = studentProfile?.totalPredictions || 0;
  const streak = studentProfile?.recentStreak || "no recent pattern";

  return `You are an expert physics education evaluator. You are analyzing a Grade 9-10 student's understanding of DC circuits. Use simple, encouraging English.

## Student data
- Total predictions made: ${total}
- Overall accuracy: ${accuracy}
- Per-concept accuracy: ${conceptAcc}
- Detected misconceptions: ${topMisc}
- Recent pattern: ${streak}

Generate a comprehensive evaluation of this student's understanding. Be specific and constructive.

Return ONLY valid JSON (no markdown):
{
  "overallAssessment": "A 3-4 sentence assessment of the student's overall understanding of DC circuits. Note their strengths and areas to improve.",
  "conceptAnalysis": [
    { "concept": "concept name", "level": "strong" | "developing" | "needs_work", "analysis": "2 sentence analysis of their understanding of this concept" }
  ],
  "misconceptions": [
    { "label": "misconception name", "explanation": "Simple explanation of why this thinking is incorrect and what the correct understanding is." }
  ],
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "Specific, actionable recommendation 3"
  ],
  "encouragement": "A short, warm, encouraging message for the student."
}`;
}

/**
 * Generate a comprehensive AI evaluation of the student's learning.
 * Falls back to null on failure.
 *
 * @param {object} studentProfile - Student learning profile
 * @returns {Promise<object|null>}
 */
async function generateEvaluation(studentProfile) {
  try {
    const prompt = buildEvaluationPrompt(studentProfile);
    const rawText = await callGemini(prompt, null, { timeoutMs: 15000 });
    const parsed = parseJsonResponse(rawText);

    if (!parsed.success || !parsed.data) return null;

    const d = parsed.data;
    if (!d.overallAssessment) return null;

    return {
      overallAssessment: d.overallAssessment,
      conceptAnalysis: Array.isArray(d.conceptAnalysis) ? d.conceptAnalysis : [],
      misconceptions: Array.isArray(d.misconceptions) ? d.misconceptions : [],
      recommendations: Array.isArray(d.recommendations) ? d.recommendations : [],
      encouragement: d.encouragement || "",
    };
  } catch (err) {
    console.warn("AI evaluation failed:", err.message);
    return null;
  }
}

module.exports = { generateTutorResponse, generateLearningSummary, generateEvaluation };
