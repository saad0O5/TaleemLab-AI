export interface CircuitComponent {
  id: string;
  type: "battery" | "resistor" | "switch" | "bulb" | "ammeter" | "voltmeter";
  voltage?: number;
  polarity?: "same" | "reversed";
  resistance?: number;
  state?: "open" | "closed";
  connects_to: string[];
}

export interface CircuitData {
  topology: "series" | "series_parallel";
  parallel_groups: string[][];
  components: CircuitComponent[];
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

export type View = "capture" | "confirm" | "simulate";

export type PredictionKey = "resistance" | "voltage" | "state";

export interface Prediction {
  key: PredictionKey;
  direction: "up" | "down";
  before?: number;
  target?: number;
  componentId?: string;
}

export interface Explanation {
  correct: boolean;
  text: string;
}

// Sanity limits for circuit values - must match backend/lib/circuitSolver.js
export const SANITY_LIMITS = {
  resistance: { min: 0, max: 10000 },  // ohms
  voltage: { min: 0, max: 100 }        // volts
};
