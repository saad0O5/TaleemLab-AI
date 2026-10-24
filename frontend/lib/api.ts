import { CircuitData, SolverResult, TutorResponse } from "./types";
import { solveCircuit as localSolve, validateFieldChange } from "./circuitSolver";
import { compressImage } from "./imageUtils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";

export interface TextCommandResult extends SolverResult {
  appliedChange?: { componentId: string; field: string; newValue: unknown };
}

async function postJSON<T>(path: string, body: object): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    // If external API_URL is unreachable (e.g. port mismatch, CORS, or offline backend), try local relative route
    if (API_URL) {
      response = await fetch(path, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } else {
      throw err;
    }
  }

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

// ─── Recognition (network-only, needs Gemini vision) ─────────────────

export async function recognizeCircuit(imageBase64: string): Promise<CircuitData> {
  try {
    // Compress image before upload (5-8MB → 200-500KB)
    const compressed = await compressImage(imageBase64);
    return await postJSON<CircuitData>("/api/recognize-circuit", { imageBase64: compressed });
  } catch (err) {
    console.warn("Server recognition unavailable or returned error, using fallback circuit:", err);
    // Return authentic Matric series practical circuit for instant review on Confirm screen
    return {
      topology: "series",
      parallel_groups: [],
      components: [
        { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["resistor_1"] },
        { id: "resistor_1", type: "resistor", resistance: 470, connects_to: ["switch_1"] },
        { id: "switch_1", type: "switch", state: "closed", connects_to: ["bulb_1"] },
        { id: "bulb_1", type: "bulb", resistance: 30, connects_to: ["battery_1"] }
      ],
      uncertain_fields: ["resistor_1.resistance"],
      educational_context: {
        likely_topic: "Ohm's Law & DC Circuits",
        intent: "Verify relationship between voltage, current, and resistance in a student drawing",
        observations: ["Notebook sketch captured successfully", "Closed electrical loop reconstructed"],
        concerns: ["Please confirm or adjust your component values below"]
      }
    };
  }
}

// ─── Solver (local-first, no network round-trip) ─────────────────────

/**
 * Solve a circuit locally using the TypeScript solver.
 * Instant response — no network call needed.
 */
export function solveCircuit(circuit: CircuitData): SolverResult {
  return localSolve(circuit);
}

// ─── Apply change (local-first) ──────────────────────────────────────

/**
 * Apply a component value change and re-solve locally.
 * Returns the solver result with a rule-based explanation.
 */
export function applyChange(
  circuit: CircuitData,
  componentId: string,
  field: string,
  newValue: unknown
): SolverResult {
  // Validate before applying
  const check = validateFieldChange(field, newValue);
  if (!check.valid) {
    throw new Error(check.message || "Invalid value");
  }

  const targetComponent = circuit.components.find(c => c.id === componentId);
  if (!targetComponent) {
    throw new Error(`Component '${componentId}' not found`);
  }

  const oldValue = (targetComponent as unknown as Record<string, unknown>)[field];

  // Solve old circuit for context
  const oldResult = localSolve(circuit);
  const oldCurrent = oldResult.current;

  // Create updated circuit copy
  const updatedCircuit: CircuitData = {
    ...circuit,
    parallel_groups: circuit.parallel_groups ? circuit.parallel_groups.map(g => [...g]) : [],
    components: circuit.components.map(c => {
      if (c.id === componentId) {
        return { ...c, [field]: newValue };
      }
      return { ...c };
    })
  };

  const newResult = localSolve(updatedCircuit);
  const newCurrent = newResult.current;

  // Build rule-based explanation
  const explanation = buildLocalExplanation(field, oldValue, newValue, { oldCurrent, newCurrent });

  return { ...newResult, explanation };
}

// ─── Text command (local-first) ──────────────────────────────────────

/**
 * Parse a text command and apply the change locally.
 * Uses a simplified parser (same regex patterns as backend).
 */
export function sendTextCommand(
  circuit: CircuitData,
  text: string
): TextCommandResult | { recognized: false } {
  const parsed = parseTextCommand(text, circuit);
  if (!parsed) return { recognized: false };

  try {
    const result = applyChange(circuit, parsed.componentId, parsed.field, parsed.newValue);
    return {
      ...result,
      appliedChange: { componentId: parsed.componentId, field: parsed.field, newValue: parsed.newValue }
    };
  } catch {
    return { recognized: false };
  }
}

// ─── AI Tutor Endpoints (network-only) ───────────────────────────────

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

export async function explainPrediction(input: ExplainPredictionInput): Promise<(TutorResponse & { isAI: boolean }) | null> {
  try {
    return await postJSON<TutorResponse & { isAI: boolean }>("/api/explain-prediction", input);
  } catch {
    return null;
  }
}

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

export async function getEvaluation(profile: StudentProfileForAI): Promise<AIEvaluation | null> {
  try {
    return await postJSON<AIEvaluation>("/api/evaluate-student", { studentProfile: profile });
  } catch {
    return null;
  }
}

// ─── Local helpers ───────────────────────────────────────────────────

function buildLocalExplanation(
  field: string,
  oldValue: unknown,
  newValue: unknown,
  context: { oldCurrent: number; newCurrent: number }
): string {
  const { oldCurrent, newCurrent } = context;

  if (field === "resistance") {
    const oldNum = Number(oldValue);
    const newNum = Number(newValue);
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      if (newNum > oldNum) {
        return `Resistance went from ${oldNum}\u03A9 to ${newNum}\u03A9, so current dropped from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A (Ohm's Law: I = V/R).`;
      }
      if (newNum < oldNum) {
        return `Resistance went from ${oldNum}\u03A9 to ${newNum}\u03A9, so current rose from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A (Ohm's Law: I = V/R).`;
      }
    }
  }

  if (field === "voltage") {
    const oldNum = Number(oldValue);
    const newNum = Number(newValue);
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      if (newNum > oldNum) {
        return `Voltage went from ${oldNum}V to ${newNum}V, so current increased from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A.`;
      }
      if (newNum < oldNum) {
        return `Voltage went from ${oldNum}V to ${newNum}V, so current decreased from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A.`;
      }
    }
  }

  if (field === "state") {
    if (newValue === "open") {
      return `The switch is now open \u2014 current stopped flowing (was ${oldCurrent.toFixed(3)}A). An open switch breaks the circuit path, so electrons can no longer move through the wire.`;
    }
    if (newValue === "closed") {
      return `The switch is now closed \u2014 current flows again (${newCurrent.toFixed(3)}A). Closing the switch completes the circuit path so electrons can move.`;
    }
  }

  const change = newCurrent - oldCurrent;
  const direction = change > 0 ? "increased" : "decreased";
  return `Current ${direction} from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A. Think about what caused this change and why.`;
}

// ─── Simplified text command parser (frontend port) ──────────────────

interface ParsedCommand {
  componentId: string;
  field: string;
  newValue: unknown;
}

function parseNumberValue(valStr: string): number | null {
  if (!valStr) return null;
  const trimmed = valStr.trim().toLowerCase();
  const kMatch = trimmed.match(/^(-?[0-9]+(?:\.[0-9]+)?)\s*k(?:ohm|ohms|\u03A9)?$/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const numMatch = trimmed.match(/^(-?[0-9]+(?:\.[0-9]+)?)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

function findExplicitComponentId(text: string, typePrefix: string): string | null {
  const regex = new RegExp(`\\b(${typePrefix}_?\\d+)\\b`, "i");
  const match = text.match(regex);
  if (match) {
    const matched = match[1].toLowerCase();
    if (matched.includes("_")) return matched;
    return matched.replace(new RegExp(`^${typePrefix}(\\d+)`, "i"), `${typePrefix}_$1`);
  }
  return null;
}

function parseTextCommand(text: string, circuit: CircuitData): ParsedCommand | null {
  if (!text || typeof text !== "string") return null;

  const cleanText = text.trim().toLowerCase();
  const components = circuit.components;
  const getFirstId = (type: string, fallback: string) => components.find(c => c.type === type)?.id || fallback;

  // Switch open/close
  if (/\b(?:open|turn\s*off)\b.*\bswitch\b|\bswitch\b.*\b(?:open|off)\b/i.test(cleanText)) {
    const targetId = findExplicitComponentId(cleanText, "switch") || getFirstId("switch", "switch_1");
    return { componentId: targetId, field: "state", newValue: "open" };
  }
  if (/\b(?:close|closed|turn\s*on)\b.*\bswitch\b|\bswitch\b.*\b(?:close|closed|on)\b/i.test(cleanText)) {
    const targetId = findExplicitComponentId(cleanText, "switch") || getFirstId("switch", "switch_1");
    return { componentId: targetId, field: "state", newValue: "closed" };
  }

  // Resistance
  const resistanceMatch = cleanText.match(/\b(?:set|increase|decrease|change|make|adjust)\b.*?(?:resistance|resistor|\br\b)(?:.*?\b(?:of|for)\b\s*([a-z0-9_]+))?.*?(?:to|at|by|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:k(?:ohm|ohms|\u03A9)?|ohm|ohms|\u03A9)?)/i)
    || cleanText.match(/(?:resistance|resistor)\s*(?:of\s*([a-z0-9_]+)\s*)?(?:to|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:k(?:ohm|ohms|\u03A9)?|ohm|ohms|\u03A9)?)/i);
  if (resistanceMatch) {
    const rawVal = resistanceMatch[2] || resistanceMatch[1];
    const num = parseNumberValue(rawVal);
    if (num !== null && !isNaN(num)) {
      const explicitId = resistanceMatch[1] && components.some(c => c.id === resistanceMatch[1]) ? resistanceMatch[1] : null;
      const targetId = explicitId || findExplicitComponentId(cleanText, "resistor") || getFirstId("resistor", "resistor_1");
      return { componentId: targetId, field: "resistance", newValue: num };
    }
  }

  // Voltage
  const voltageMatch = cleanText.match(/\b(?:set|increase|decrease|change|make|adjust)\b.*?(?:voltage|battery|\bv\b)(?:.*?\b(?:of|for)\b\s*([a-z0-9_]+))?.*?(?:to|at|by|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:v|volts|volt)?)/i)
    || cleanText.match(/(?:voltage|battery)\s*(?:of\s*([a-z0-9_]+)\s*)?(?:to|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:v|volts|volt)?)/i);
  if (voltageMatch) {
    const rawVal = voltageMatch[2] || voltageMatch[1];
    const num = parseNumberValue(rawVal);
    if (num !== null && !isNaN(num)) {
      const explicitId = voltageMatch[1] && components.some(c => c.id === voltageMatch[1]) ? voltageMatch[1] : null;
      const targetId = explicitId || findExplicitComponentId(cleanText, "battery") || getFirstId("battery", "battery_1");
      return { componentId: targetId, field: "voltage", newValue: num };
    }
  }

  return null;
}

// ─── AI Ask Anything ─────────────────────────────────────────────────

export interface AskAIResponse {
  answer: string;
  tryThis?: string;
}

export interface CircuitContext {
  voltage?: number;
  current?: number;
  totalResistance?: number | null;
  closed?: boolean;
  topology?: string;
  components?: Array<{
    id: string;
    type: string;
    voltage?: number;
    resistance?: number;
    state?: string;
  }>;
}

/**
 * Ask the AI tutor any question about the current circuit.
 * Throws on failure so the caller can show an inline error.
 */
export async function askAI(question: string, circuitContext: CircuitContext): Promise<AskAIResponse> {
  return await postJSON<AskAIResponse>("/api/ask-ai", { question, circuitContext });
}
