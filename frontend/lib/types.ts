export interface CircuitComponent {
  id: string;
  type: "battery" | "resistor" | "switch" | "bulb" | "ammeter" | "voltmeter";
  voltage?: number;
  polarity?: "same" | "reversed";
  resistance?: number;
  state?: "open" | "closed";
  connects_to: string[];
}

/** Educational context inferred by AI from the student's drawing */
export interface EducationalContext {
  likely_topic?: string;
  intent?: string;
  observations?: string[];
  concerns?: string[];
}

export interface CircuitData {
  topology: "series" | "series_parallel";
  parallel_groups: string[][];
  components: CircuitComponent[];
  uncertain_fields?: string[];
  educational_context?: EducationalContext;
}

export interface ComponentState {
  id: string;
  type: string;
  current: number | null;
  voltage: number | null;
  brightness: number | null;
}

export type SolverFlag =
  | "battery_polarity_unset"
  | "no_battery_detected"
  | "incomplete_circuit"
  | "ideal_zero_resistance"
  | "current_capped_for_display"
  | { type: "value_out_of_range"; componentId: string; field: string; value: number };

export interface SolverResult {
  current: number;
  rawCurrent: number;
  voltage: number;
  totalResistance: number | null;
  componentStates: ComponentState[];
  flags: SolverFlag[];
  note: string | null;
  explanation?: string;
}

export type View = "capture" | "confirm" | "simulate" | "progress" | "teacher";

export type PredictionKey = "resistance" | "voltage" | "state";

export interface Prediction {
  key: PredictionKey;
  direction: "up" | "down";
  before?: number;
  target?: number;
  componentId?: string;
}

/** AI-generated tutor response after a prediction */
export interface TutorResponse {
  headline: string;
  explanation: string;
  followUp: string;
  insight: string;
  isAI: boolean;
}

export interface Explanation {
  correct: boolean;
  text: string;
  isAI: boolean;
  followUp?: string;
  insight?: string;
  predictionKey?: PredictionKey;
}

// Sanity limits for circuit values - must match backend/lib/circuitSolver.js
export const SANITY_LIMITS = {
  resistance: { min: 0, max: 10000 },  // ohms
  voltage: { min: 0, max: 100 }        // volts
};
