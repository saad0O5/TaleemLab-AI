/**
 * TaleemLab Circuit Solver — TypeScript port
 * Ported from backend/lib/circuitSolver.js for instant client-side solving.
 *
 * Scope: series circuits, single-level parallel groups (series-parallel),
 * multiple batteries in series (same-polarity assumed unless student sets
 * polarity explicitly on the Confirm screen).
 *
 * Supports: resistors, bulbs, switches, batteries, ammeters, voltmeters,
 * capacitors (DC charging), diodes (one-way current).
 */

import { CircuitData, SolverResult, ComponentState, SolverFlag } from "./types";

const BULB_FULL_BRIGHTNESS_CURRENT = 0.1; // 100 mA, "full brightness" reference

const EPSILON_RESISTANCE = 0.1;   // ohms, internal-only floor, never displayed
const NEAR_ZERO_THRESHOLD = 0.5;  // ohms — below this, treat as an "ideal circuit"
const DISPLAY_CURRENT_CAP = 5;    // amps — above this, show a qualitative flag

export const SANITY_LIMITS = {
  resistance: { min: 0, max: 10000 },  // ohms
  voltage: { min: 0, max: 100 }        // volts
};

function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function solveCircuit(circuit: CircuitData): SolverResult {
  const { components, topology } = circuit;
  const flags: SolverFlag[] = [];

  // --- Value sanity checks ---
  const hasNegativeResistance = components.some(c =>
    c.resistance !== undefined && c.resistance !== null && c.resistance < SANITY_LIMITS.resistance.min
  );
  if (hasNegativeResistance) {
    const negComp = components.find(c => c.resistance !== undefined && c.resistance !== null && c.resistance < 0)!;
    return {
      current: 0,
      rawCurrent: 0,
      voltage: 0,
      totalResistance: null,
      componentStates: [],
      flags: [{ type: "value_out_of_range", componentId: negComp.id, field: "resistance", value: negComp.resistance! }],
      note: "Negative resistance is not physically possible — resistance always opposes current flow. Please correct the value."
    };
  }

  for (const c of components) {
    if (c.resistance !== undefined && c.resistance !== null) {
      if (c.resistance > SANITY_LIMITS.resistance.max) {
        flags.push({ type: "value_out_of_range", componentId: c.id, field: "resistance", value: c.resistance });
      }
    }
    if (c.voltage !== undefined && c.voltage !== null) {
      if (c.voltage < SANITY_LIMITS.voltage.min || c.voltage > SANITY_LIMITS.voltage.max) {
        flags.push({ type: "value_out_of_range", componentId: c.id, field: "voltage", value: c.voltage });
      }
    }
  }

  // --- Battery handling ---
  const batteries = components.filter(c => c.type === "battery");

  if (batteries.length === 0) {
    return {
      current: 0,
      rawCurrent: 0,
      voltage: 0,
      totalResistance: null,
      componentStates: [],
      flags: ["no_battery_detected"],
      note: "No power source detected. Add a battery to complete the circuit."
    };
  }

  const zeroVoltage = batteries.filter(b => b.voltage === 0 || b.voltage === undefined);
  if (zeroVoltage.length > 0 && batteries.every(b => !b.voltage || b.voltage === 0)) {
    return {
      current: 0,
      rawCurrent: 0,
      voltage: 0,
      totalResistance: null,
      componentStates: [],
      flags: [{ type: "value_out_of_range", componentId: zeroVoltage[0].id, field: "voltage", value: 0 }],
      note: "A battery must have a positive voltage to drive current. Please set a voltage value."
    };
  }

  const unsetPolarity = batteries.length > 1 && batteries.some(b => !b.polarity);
  if (unsetPolarity) {
    flags.push("battery_polarity_unset");
  }

  const voltage = batteries.reduce((sum, b) => {
    const sign = b.polarity === "reversed" ? -1 : 1;
    return sum + sign * (b.voltage || 0);
  }, 0);

  const switches = components.filter(c => c.type === "switch");
  const circuitOpen = switches.some(s => s.state === "open");

  if (circuitOpen) {
    const openSwitchIds = switches.filter(s => s.state === "open").map(s => s.id);
    return {
      current: 0,
      rawCurrent: 0,
      voltage,
      totalResistance: null,
      componentStates: components.map(c => ({
        id: c.id,
        type: c.type,
        current: 0,
        voltage: c.type === "battery" ? (c.polarity === "reversed" ? -(c.voltage || 0) : (c.voltage || 0))
               : openSwitchIds.includes(c.id) ? voltage
               : 0,
        brightness: c.type === "bulb" ? 0 : null
      })),
      flags,
      note: "Circuit open — switch is off, no current flows. Full voltage appears across the open switch."
    };
  }

  // --- Basic closed-loop check ---
  const disconnected = components.some(c => !c.connects_to || c.connects_to.length === 0);
  if (disconnected) {
    return {
      current: 0,
      rawCurrent: 0,
      voltage,
      totalResistance: null,
      componentStates: [],
      flags: [...flags, "incomplete_circuit"],
      note: "This circuit isn't a complete loop. Check for a break in the connections."
    };
  }

  const resistiveElements = components.filter(
    c => c.type === "resistor" || c.type === "bulb"
  );

  // Capacitors in the circuit
  const capacitors = components.filter(c => c.type === "capacitor");
  const totalCapacitance = capacitors.length > 0
    ? capacitors.reduce((sum, c) => sum + (c.capacitance || 100), 0) // default 100μF
    : 0;

  // Diodes in the circuit (allow current only in forward direction)
  const diodes = components.filter(c => c.type === "diode");
  const DIODE_FORWARD_DROP = 0.7; // volts, typical silicon diode

  let totalResistance = 0;
  const groupEquivalentResistance: Record<number, number> = {};

  const parallelGroups = circuit.parallel_groups || [];
  const effectiveTopology = (topology === "series" && parallelGroups.length > 0)
    ? "series_parallel"
    : topology;

  if (effectiveTopology === "series") {
    totalResistance = resistiveElements.reduce((sum, c) => sum + (c.resistance || 0), 0);
  } else if (effectiveTopology === "series_parallel") {
    const groups = parallelGroups;
    const groupedIds = new Set(groups.flat());

    let parallelContribution = 0;
    groups.forEach((group, index) => {
      const groupElements = resistiveElements.filter(c => group.includes(c.id));
      const reciprocalSum = groupElements.reduce((sum, c) => {
        if ((c.resistance || 0) <= 0) return sum;
        return sum + 1 / (c.resistance || 0);
      }, 0);
      const hasShort = groupElements.some(c => c.resistance !== undefined && c.resistance <= 0);
      const req = hasShort ? 0 : (reciprocalSum > 0 ? 1 / reciprocalSum : 0);
      groupEquivalentResistance[index] = req;
      parallelContribution += req;
    });

    const seriesContribution = resistiveElements
      .filter(c => !groupedIds.has(c.id))
      .reduce((sum, c) => sum + (c.resistance || 0), 0);

    totalResistance = parallelContribution + seriesContribution;
  } else {
    return {
      current: 0,
      rawCurrent: 0,
      voltage: 0,
      totalResistance: null,
      componentStates: [],
      flags: ["incomplete_circuit"],
      note: `This circuit topology ('${effectiveTopology}') isn't supported yet. Only series and series-parallel circuits are recognized.`
    };
  }

  let effectiveResistance = totalResistance;

  // Account for diode forward voltage drop
  const diodeDrop = diodes.length * DIODE_FORWARD_DROP;
  const effectiveVoltage = Math.max(0, voltage - diodeDrop);

  if (totalResistance <= NEAR_ZERO_THRESHOLD) {
    effectiveResistance = EPSILON_RESISTANCE;
    flags.push("ideal_zero_resistance");
  }

  const rawCurrent = effectiveVoltage / effectiveResistance;
  const displayCapped = rawCurrent > DISPLAY_CURRENT_CAP;
  if (displayCapped) {
    flags.push("current_capped_for_display");
  }
  const totalCurrent = rawCurrent;

  // --- Pass 1: resolve non-meter components ---
  const componentStatesMap: Record<string, ComponentState> = {};

  for (const c of components) {
    if (c.type === "battery") {
      const sign = c.polarity === "reversed" ? -1 : 1;
      componentStatesMap[c.id] = { id: c.id, type: c.type, current: round(totalCurrent), voltage: sign * (c.voltage || 0), brightness: null };
      continue;
    }

    if (c.type === "resistor" || c.type === "bulb") {
      const groupIndex = parallelGroups.findIndex(g => g.includes(c.id));
      const inGroup = groupIndex !== -1;
      let current: number, voltageAcross: number;

      if (inGroup) {
        const req = groupEquivalentResistance[groupIndex] || 0;
        voltageAcross = round(totalCurrent * req);
        current = round((c.resistance || 0) > 0 ? voltageAcross / (c.resistance || 0) : 0);
      } else {
        current = round(totalCurrent);
        voltageAcross = round(current * (c.resistance || 0));
      }

      const brightness =
        c.type === "bulb"
          ? Math.min(round(current / BULB_FULL_BRIGHTNESS_CURRENT, 3), 1)
          : null;

      componentStatesMap[c.id] = { id: c.id, type: c.type, current, voltage: voltageAcross, brightness };
      continue;
    }

    if (c.type === "switch") {
      componentStatesMap[c.id] = { id: c.id, type: c.type, current: round(totalCurrent), voltage: 0, brightness: null };
      continue;
    }

    if (c.type === "ammeter") {
      componentStatesMap[c.id] = { id: c.id, type: c.type, current: round(totalCurrent), voltage: 0, brightness: null };
      continue;
    }

    if (c.type === "capacitor") {
      // DC behavior: capacitor charges over time, eventually blocks current
      // For now, treat as open circuit when fully charged
      // The chargeLevel (0-1) represents how charged it is
      // We'll compute a simple steady-state: if current > 0, capacitor is still charging
      const capacitance = c.capacitance || 100; // default 100μF
      const tau = totalResistance > 0 ? (totalResistance * capacitance * 1e-6) : 0.001;
      // For simulation: assume we're showing steady state after ~5τ
      // Capacitor acts like open circuit in steady state DC
      componentStatesMap[c.id] = {
        id: c.id,
        type: c.type,
        current: round(totalCurrent), // transient current while charging
        voltage: round(effectiveVoltage), // charges to full voltage
        brightness: null,
        // @ts-ignore - extension for capacitor
        chargeLevel: 1, // 0 = empty, 1 = fully charged
        tau: round(tau, 4), // time constant in seconds
      };
      continue;
    }

    if (c.type === "diode") {
      // Diode: allows current only in forward direction, drops ~0.7V
      const forwardBiased = effectiveVoltage > 0;
      componentStatesMap[c.id] = {
        id: c.id,
        type: c.type,
        current: forwardBiased ? round(totalCurrent) : 0,
        voltage: forwardBiased ? round(DIODE_FORWARD_DROP) : round(effectiveVoltage),
        brightness: null,
      };
      continue;
    }
  }

  // --- Pass 2: resolve voltmeters ---
  for (const c of components) {
    if (c.type !== "voltmeter") continue;

    const inGroup = parallelGroups.find(g => g.includes(c.id));
    let measuredVoltage = voltage;

    if (inGroup) {
      const targetId = inGroup.find(id => id !== c.id);
      const targetState = targetId ? componentStatesMap[targetId] : null;
      measuredVoltage = targetState ? targetState.voltage! : voltage;
    }

    componentStatesMap[c.id] = { id: c.id, type: c.type, current: 0, voltage: round(measuredVoltage), brightness: null };
  }

  return {
    current: round(displayCapped ? DISPLAY_CURRENT_CAP : totalCurrent),
    rawCurrent: round(totalCurrent),
    voltage,
    totalResistance: round(totalResistance),
    totalCapacitance: totalCapacitance > 0 ? round(totalCapacitance) : null,
    componentStates: components.map(c => componentStatesMap[c.id]),
    flags,
    note: null
  };
}

/**
 * Validate a field change value against sanity limits.
 */
export function validateFieldChange(field: string, newValue: unknown): { valid: boolean; error?: string; message?: string } {
  if (field === "resistance") {
    const numVal = Number(newValue);
    if (isNaN(numVal)) {
      return { valid: false, error: "invalid_value", message: "Resistance must be a number." };
    }
    if (numVal < SANITY_LIMITS.resistance.min) {
      return { valid: false, error: "value_out_of_bounds", message: "Resistance can't be negative — resistors always oppose current flow, they can't push it." };
    }
    if (numVal > SANITY_LIMITS.resistance.max) {
      return { valid: false, error: "value_out_of_bounds", message: "That's higher than this simulator supports — try a value under 10,000 ohms." };
    }
  }

  if (field === "voltage") {
    const numVal = Number(newValue);
    if (isNaN(numVal)) {
      return { valid: false, error: "invalid_value", message: "Voltage must be a number." };
    }
    if (numVal < SANITY_LIMITS.voltage.min) {
      return { valid: false, error: "value_out_of_bounds", message: "Voltage can't be negative in this simulator — it represents the battery's push, always positive here." };
    }
    if (numVal > SANITY_LIMITS.voltage.max) {
      return { valid: false, error: "value_out_of_bounds", message: "That's higher than a typical classroom circuit — try a value under 100 volts." };
    }
  }

  return { valid: true };
}
