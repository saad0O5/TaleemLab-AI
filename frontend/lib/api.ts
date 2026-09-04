import { CircuitData, SolverResult, TutorResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface TextCommandResult extends SolverResult {
  appliedChange?: { componentId: string; field: string; newValue: any };
}

async function postJSON<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errMsg = `API error: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) {
        errMsg = errJson.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

export async function recognizeCircuit(imageBase64: string): Promise<CircuitData> {
  return postJSON<CircuitData>("/api/recognize-circuit", { imageBase64 });
}

export async function solveCircuit(circuit: CircuitData): Promise<SolverResult> {
  return postJSON<SolverResult>("/api/solve-circuit", { circuit });
}

export async function applyChange(
  circuit: CircuitData,
  componentId: string,
  field: string,
  newValue: any
): Promise<SolverResult> {
  return postJSON<SolverResult>("/api/apply-change", { circuit, componentId, field, newValue });
}

export async function sendTextCommand(
  circuit: CircuitData,
  text: string
): Promise<TextCommandResult | { recognized: false }> {
  return postJSON<TextCommandResult | { recognized: false }>("/api/text-command", { circuit, text });
}

// ─── AI Tutor Endpoints ──────────────────────────────────────────────

export interface ExplainPredictionInput {
  predictionKey: string;
  direction: "up" | "down";
  studentAnswer: "up" | "down" | "same";
  correct: boolean;
  oldValue?: number;
  newValue?: number | string;
  oldCurrent?: number;
  newCurrent?: number;
  studentProfile: StudentProfileForAI;
}

export interface StudentProfileForAI {
  totalPredictions: number;
  accuracy: number;
  conceptAccuracy: Record<string, number>;
  topMisconceptions: { id: string; label: string; description: string; confidence: number }[];
  recentStreak?: string;
}

/**
 * Get a personalized AI tutor explanation after a prediction.
 * Returns null if the AI call fails (caller should fall back to templates).
 */
export async function explainPrediction(input: ExplainPredictionInput): Promise<(TutorResponse & { isAI: boolean }) | null> {
  try {
    return await postJSON<TutorResponse & { isAI: boolean }>("/api/explain-prediction", input);
  } catch {
    return null;
  }
}

/**
 * Get an AI-generated learning summary for the progress page.
 * Returns null if the AI call fails.
 */
export async function getLearningSummary(profile: StudentProfileForAI): Promise<{ summary: string; isAI: boolean } | null> {
  try {
    return await postJSON<{ summary: string; isAI: boolean }>("/api/learning-summary", { studentProfile: profile });
  } catch {
    return null;
  }
}

export interface AIEvaluation {
  overallAssessment: string;
  conceptAnalysis: { concept: string; level: 'strong' | 'developing' | 'needs_work'; analysis: string }[];
  misconceptions: { label: string; explanation: string }[];
  recommendations: string[];
  encouragement: string;
  isAI: boolean;
}

/**
 * Get a comprehensive AI evaluation of the student's learning.
 * Returns null if the AI call fails.
 */
export async function getEvaluation(profile: StudentProfileForAI): Promise<AIEvaluation | null> {
  try {
    return await postJSON<AIEvaluation>("/api/evaluate-student", { studentProfile: profile });
  } catch {
    return null;
  }
}
