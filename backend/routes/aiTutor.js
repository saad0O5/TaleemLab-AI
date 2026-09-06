/**
 * AI Tutor routes:
 *   POST /api/explain-prediction
 *   POST /api/learning-summary
 *   POST /api/evaluate-student
 */
const { generateTutorResponse, generateLearningSummary, generateEvaluation } = require("../lib/aiTutor");
const { explainChange } = require("../lib/explanations");

// ─── POST /api/explain-prediction ────────────────────────────────────

async function handleExplainPrediction(req, res, { parseRequestBody, sendJSON }) {
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
    console.error("Explain-prediction route error:", err);
    return sendJSON(res, 500, {
      error: "explain_error",
      message: "An internal error occurred. Please try again."
    });
  }
}

// ─── POST /api/learning-summary ──────────────────────────────────────

async function handleLearningSummary(req, res, { parseRequestBody, sendJSON }) {
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
    console.error("Learning-summary route error:", err);
    return sendJSON(res, 500, {
      error: "summary_error",
      message: "An internal error occurred. Please try again."
    });
  }
}

// ─── POST /api/evaluate-student ──────────────────────────────────────

async function handleEvaluateStudent(req, res, { parseRequestBody, sendJSON }) {
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
    console.error("Evaluate-student route error:", err);
    return sendJSON(res, 500, {
      error: "evaluation_error",
      message: "An internal error occurred. Please try again."
    });
  }
}

module.exports = { handleExplainPrediction, handleLearningSummary, handleEvaluateStudent };
