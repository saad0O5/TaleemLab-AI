/**
 * TaleemLab Circuit Solver — v3
 * Bulb-as-resistor model. Component IDs follow "type_number" convention.
 *
 * Scope: series circuits, single-level parallel groups (series-parallel),
 * multiple batteries in series (same-polarity assumed unless student sets
 * polarity explicitly on the Confirm screen).
 *
 * v3 changes (MVP-completeness fixes, not new features):
 * - Multiple batteries: summed in series, with per-battery polarity support.
 * - Voltmeter: reports voltage across whatever it's connected in parallel with.
 * - Graceful handling when no battery is detected (no crash).
 * - Graceful handling when the circuit doesn't form a valid closed loop.
 * - Display-safe current: huge values (e.g. from near-zero resistance) are
 *   capped with a qualitative flag instead of showing a raw absurd number.
 * - Value sanity flags: negative or wildly out-of-range values are flagged
 *   for the Confirm screen to surface to the student, not silently computed.
 */

const BULB_FULL_BRIGHTNESS_CURRENT = 0.1; // 100 mA, "full brightness" reference

const EPSILON_RESISTANCE = 0.1;   // ohms, internal-only floor, never displayed
const NEAR_ZERO_THRESHOLD = 0.5;  // ohms — below this, treat as an "ideal circuit"
const DISPLAY_CURRENT_CAP = 5;    // amps — above this, show a qualitative flag, not the raw number

const SANITY_LIMITS = {
  resistance: { min: 0, max: 10000 },  // ohms
  voltage: { min: 0, max: 100 }        // volts, generous for classroom DC examples
};

function solveCircuit(circuit) {
  const { components, topology } = circuit;
  const flags = [];

  // --- Value sanity checks (run first, non-blocking) ---
  for (const c of components) {
    if (c.resistance !== undefined && c.resistance !== null) {
      if (c.resistance < SANITY_LIMITS.resistance.min || c.resistance > SANITY_LIMITS.resistance.max) {
        flags.push({ type: "value_out_of_range", componentId: c.id, field: "resistance", value: c.resistance });
      }
    }
    if (c.voltage !== undefined && c.voltage !== null) {
      if (c.voltage < SANITY_LIMITS.voltage.min || c.voltage > SANITY_LIMITS.voltage.max) {
        flags.push({ type: "value_out_of_range", componentId: c.id, field: "voltage", value: c.voltage });
      }
    }
  }

  // --- Battery handling: supports multiple batteries in series ---
  const batteries = components.filter(c => c.type === "battery");

  if (batteries.length === 0) {
    return {
      current: 0,
      voltage: 0,
      totalResistance: null,
      componentStates: [],
      flags: ["no_battery_detected"],
      note: "No power source detected. Add a battery to complete the circuit."
    };
  }

  const unsetPolarity = batteries.length > 1 && batteries.some(b => !b.polarity);
  if (unsetPolarity) {
    flags.push("battery_polarity_unset");
  }

  const voltage = batteries.reduce((sum, b) => {
    const sign = b.polarity === "reversed" ? -1 : 1;
    return sum + sign * b.voltage;
  }, 0);

  const switches = components.filter(c => c.type === "switch");
  const circuitOpen = switches.some(s => s.state === "open");

  if (circuitOpen) {
    return {
      current: 0,
      voltage,
      totalResistance: null,
      componentStates: components.map(c => ({
        id: c.id,
        type: c.type,
        current: 0,
        voltage: 0,
        brightness: c.type === "bulb" ? 0 : null
      })),
      flags,
      note: "Circuit open — switch is off, no current flows."
    };
  }

  // --- Basic closed-loop check ---
  // Lightweight, not full graph traversal: catches the common "dangling
  // component" case (a component with no listed connections at all).
  const disconnected = components.some(c => !c.connects_to || c.connects_to.length === 0);
  if (disconnected) {
    return {
      current: 0,
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

  let totalResistance = 0;
  // Per-group equivalent resistance, kept separately (not just summed into one
  // number) so we can later compute how much of the total voltage each parallel
  // group actually gets, when multiple groups sit in series with each other.
  const groupEquivalentResistance = {}; // groupIndex -> Req

  // If topology is labeled "series" but parallel_groups are present, treat as
  // series_parallel — a component listed in parallel_groups is meaningfully
  // parallel regardless of the topology label (e.g. voltmeter across a resistor).
  const effectiveTopology = (topology === "series" && circuit.parallel_groups && circuit.parallel_groups.length > 0)
    ? "series_parallel"
    : topology;

  if (effectiveTopology === "series") {
    totalResistance = resistiveElements.reduce((sum, c) => sum + c.resistance, 0);
  } else if (effectiveTopology === "series_parallel") {
    const groups = circuit.parallel_groups || [];
    const groupedIds = new Set(groups.flat());

    let parallelContribution = 0;
    groups.forEach((group, index) => {
      const groupElements = resistiveElements.filter(c => group.includes(c.id));
      const reciprocalSum = groupElements.reduce((sum, c) => sum + 1 / c.resistance, 0);
      const req = reciprocalSum > 0 ? 1 / reciprocalSum : 0;
      groupEquivalentResistance[index] = req;
      parallelContribution += req;
    });

    const seriesContribution = resistiveElements
      .filter(c => !groupedIds.has(c.id))
      .reduce((sum, c) => sum + c.resistance, 0);

    totalResistance = parallelContribution + seriesContribution;
  } else {
    throw new Error(`Unsupported topology: ${effectiveTopology}`);
  }

  let effectiveResistance = totalResistance;

  if (totalResistance <= NEAR_ZERO_THRESHOLD) {
    effectiveResistance = EPSILON_RESISTANCE;
    flags.push("ideal_zero_resistance");
  }

  const rawCurrent = voltage / effectiveResistance;
  const displayCapped = rawCurrent > DISPLAY_CURRENT_CAP;
  if (displayCapped) {
    flags.push("current_capped_for_display");
  }
  const totalCurrent = rawCurrent;

  const parallelGroups = circuit.parallel_groups || [];

  // --- Pass 1: resolve every non-meter component (battery, resistor, bulb, switch, ammeter) ---
  const componentStates = {};

  for (const c of components) {
    if (c.type === "battery") {
      const sign = c.polarity === "reversed" ? -1 : 1;
      componentStates[c.id] = { id: c.id, type: c.type, current: round(totalCurrent), voltage: sign * c.voltage, brightness: null };
      continue;
    }

    if (c.type === "resistor" || c.type === "bulb") {
      const groupIndex = parallelGroups.findIndex(g => g.includes(c.id));
      const inGroup = groupIndex !== -1;
      let current, voltageAcross;

      if (inGroup) {
        // This component's group only carries its SHARE of the total voltage,
        // proportional to the group's equivalent resistance vs. the whole
        // circuit's resistance — NOT the full source voltage, unless this
        // group happens to be the only thing in the circuit (single-group case).
        const req = groupEquivalentResistance[groupIndex] || 0;
        voltageAcross = round(totalCurrent * req);
        current = round(c.resistance > 0 ? voltageAcross / c.resistance : 0);
      } else {
        current = round(totalCurrent);
        voltageAcross = round(current * c.resistance);
      }

      const brightness =
        c.type === "bulb"
          ? Math.min(round(current / BULB_FULL_BRIGHTNESS_CURRENT, 3), 1)
          : null;

      componentStates[c.id] = { id: c.id, type: c.type, current, voltage: voltageAcross, brightness };
      continue;
    }

    if (c.type === "switch") {
      componentStates[c.id] = { id: c.id, type: c.type, current: round(totalCurrent), voltage: 0, brightness: null };
      continue;
    }

    if (c.type === "ammeter") {
      componentStates[c.id] = { id: c.id, type: c.type, current: round(totalCurrent), voltage: 0, brightness: null };
      continue;
    }

    // voltmeter resolved in pass 2, once every other component's voltage is known
  }

  // --- Pass 2: resolve voltmeters, now that componentStates is fully populated ---
  for (const c of components) {
    if (c.type !== "voltmeter") continue;

    const inGroup = parallelGroups.find(g => g.includes(c.id));
    let measuredVoltage = voltage;

    if (inGroup) {
      const targetId = inGroup.find(id => id !== c.id);
      const targetState = targetId ? componentStates[targetId] : null;
      measuredVoltage = targetState ? targetState.voltage : voltage;
    }

    componentStates[c.id] = { id: c.id, type: c.type, current: 0, voltage: round(measuredVoltage), brightness: null };
  }

  return {
    current: round(displayCapped ? DISPLAY_CURRENT_CAP : totalCurrent),
    rawCurrent: round(totalCurrent), // uncapped, for internal use if ever needed
    voltage,
    totalResistance: round(totalResistance),
    componentStates: components.map(c => componentStates[c.id]),
    flags,
    note: null
  };
}

function round(value, decimals = 3) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// --- Manual test cases — run with `node circuit_solver_v3.js` ---
if (require.main === module) {
  const seriesExample = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1", "bulb_1"] },
      { id: "bulb_1", type: "bulb", resistance: 30, connects_to: ["resistor_1", "battery_1"] }
    ]
  };
  console.log("1. Series example (matches teammate's mockup):");
  console.log(JSON.stringify(solveCircuit(seriesExample), null, 2));

  const idealBulbExample = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["bulb_1"] },
      { id: "bulb_1", type: "bulb", resistance: 0, connects_to: ["battery_1"] }
    ]
  };
  console.log("\n2. Ideal circuit (bulb resistance = 0) — no crash, capped display:");
  console.log(JSON.stringify(solveCircuit(idealBulbExample), null, 2));

  const multiBatterySeries = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["battery_2"] },
      { id: "battery_2", type: "battery", voltage: 3, polarity: "same", connects_to: ["battery_1", "resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_2"] }
    ]
  };
  console.log("\n3. Two batteries in series, same polarity (9V + 3V = 12V):");
  console.log(JSON.stringify(solveCircuit(multiBatterySeries), null, 2));

  const multiBatteryUnsetPolarity = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["battery_2"] },
      { id: "battery_2", type: "battery", voltage: 3, connects_to: ["battery_1", "resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_2"] }
    ]
  };
  console.log("\n4. Two batteries, polarity NOT set — should flag for student confirmation:");
  console.log(JSON.stringify(solveCircuit(multiBatteryUnsetPolarity), null, 2));

  const noBatteryExample = {
    topology: "series",
    components: [
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["bulb_1"] },
      { id: "bulb_1", type: "bulb", resistance: 30, connects_to: ["resistor_1"] }
    ]
  };
  console.log("\n5. No battery detected — graceful, no crash:");
  console.log(JSON.stringify(solveCircuit(noBatteryExample), null, 2));

  const disconnectedExample = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: [] }
    ]
  };
  console.log("\n6. Disconnected/incomplete circuit — graceful, no crash:");
  console.log(JSON.stringify(solveCircuit(disconnectedExample), null, 2));

  const outOfRangeExample = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: -50, connects_to: ["battery_1"] }
    ]
  };
  console.log("\n7. Nonsense value (negative resistance) — flagged, not silently trusted:");
  console.log(JSON.stringify(solveCircuit(outOfRangeExample), null, 2));

  const openSwitchExample = {
    topology: "series",
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["switch_1"] },
      { id: "switch_1", type: "switch", state: "open", connects_to: ["battery_1", "resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["switch_1"] }
    ]
  };
  console.log("\n8. Open switch example:");
  console.log(JSON.stringify(solveCircuit(openSwitchExample), null, 2));

  const parallelExample = {
    topology: "series_parallel",
    parallel_groups: [["resistor_1", "resistor_2"]],
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1"] },
      { id: "resistor_2", type: "resistor", resistance: 100, connects_to: ["battery_1"] }
    ]
  };
  console.log("\n9. Parallel example:");
  console.log(JSON.stringify(solveCircuit(parallelExample), null, 2));

  const voltmeterExample = {
    topology: "series",
    parallel_groups: [["resistor_1", "voltmeter_1"]],
    components: [
      { id: "battery_1", type: "battery", voltage: 9, connects_to: ["resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1"] },
      { id: "voltmeter_1", type: "voltmeter", connects_to: ["resistor_1"] }
    ]
  };
  console.log("\n10. Voltmeter across the resistor:");
  console.log(JSON.stringify(solveCircuit(voltmeterExample), null, 2));

  // Real case found via Gemini test on capture3.jpeg: two parallel groups IN
  // SERIES with each other, not just one group as the whole circuit.
  const twoGroupsInSeries = {
    topology: "series_parallel",
    parallel_groups: [["resistor_1", "resistor_2"], ["resistor_3", "resistor_4"]],
    components: [
      { id: "battery_1", type: "battery", voltage: 24, connects_to: ["resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1"] },
      { id: "resistor_2", type: "resistor", resistance: 250, connects_to: ["battery_1"] },
      { id: "resistor_3", type: "resistor", resistance: 350, connects_to: ["resistor_1"] },
      { id: "resistor_4", type: "resistor", resistance: 200, connects_to: ["resistor_1"] }
    ]
  };
  console.log("\n11. Two parallel groups in series (real case from Gemini test):");
  console.log(JSON.stringify(solveCircuit(twoGroupsInSeries), null, 2));
  // Expect: totalResistance ~198.7, group1 (r1||r2) shares ~8.65V, group2
  // (r3||r4) shares ~15.05V — NOT 24V each. Voltages must differ between groups.
}

module.exports = { solveCircuit, BULB_FULL_BRIGHTNESS_CURRENT, DISPLAY_CURRENT_CAP, SANITY_LIMITS };