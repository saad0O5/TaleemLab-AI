/**
 * TaleemLab pipeline tests — run with `npm run test:pipeline`
 *
 * Exercises the deterministic circuit solver, the natural-language command
 * parser, and the recognition type-parity guard. No network, no API key,
 * no external test framework — plain Node so it runs anywhere in CI or locally.
 */

const fs = require("fs");
const path = require("path");
const { solveCircuit, SANITY_LIMITS } = require("./lib/circuitSolver");
const { parseCommand, parseNumberValue } = require("./lib/textCommandParser");

let passed = 0;
let failed = 0;

function approx(actual, expected, tol = 0.01) {
  return Math.abs(actual - expected) <= tol;
}

function hasFlag(flags, name) {
  return flags.some(f => (typeof f === "string" ? f === name : f && f.type === name));
}

function check(label, cond) {
  if (cond) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// ─── Solver: series ────────────────────────────────────────────────────
section("Circuit solver");
const series = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1", "bulb_1"] },
    { id: "bulb_1", type: "bulb", resistance: 30, connects_to: ["resistor_1", "battery_1"] },
  ],
});
check("series total resistance = 130Ω", series.totalResistance === 130);
check("series current ≈ 0.069A (I = V/R)", approx(series.current, 9 / 130));

// ─── Solver: parallel group ────────────────────────────────────────────
const parallel = solveCircuit({
  topology: "series_parallel",
  parallel_groups: [["resistor_1", "resistor_2"]],
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1"] },
    { id: "resistor_2", type: "resistor", resistance: 100, connects_to: ["battery_1"] },
  ],
});
check("two 100Ω in parallel → 50Ω", parallel.totalResistance === 50);
check("parallel current ≈ 0.18A", approx(parallel.current, 9 / 50));

// ─── Solver: multi-battery ─────────────────────────────────────────────
const twoBatteries = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["battery_2"] },
    { id: "battery_2", type: "battery", voltage: 3, polarity: "same", connects_to: ["battery_1", "resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_2"] },
  ],
});
check("two same-polarity batteries add (9V + 3V = 12V)", twoBatteries.voltage === 12);

// ─── Solver: graceful edge cases ───────────────────────────────────────
const openSwitch = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["switch_1"] },
    { id: "switch_1", type: "switch", state: "open", connects_to: ["battery_1", "resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["switch_1"] },
  ],
});
check("open switch → no current", openSwitch.current === 0);

const negativeR = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: -50, connects_to: ["battery_1"] },
  ],
});
check("negative resistance is flagged, not solved", hasFlag(negativeR.flags, "value_out_of_range") && negativeR.current === 0);

const noBattery = solveCircuit({
  topology: "series",
  components: [
    { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["bulb_1"] },
    { id: "bulb_1", type: "bulb", resistance: 30, connects_to: ["resistor_1"] },
  ],
});
check("missing battery → graceful, no crash", noBattery.current === 0 && hasFlag(noBattery.flags, "no_battery_detected"));

const idealZero = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["bulb_1"] },
    { id: "bulb_1", type: "bulb", resistance: 0, connects_to: ["battery_1"] },
  ],
});
check("near-zero resistance caps display current", idealZero.current === 5 && hasFlag(idealZero.flags, "ideal_zero_resistance"));

const rcCircuit = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 1000, connects_to: ["capacitor_1"] },
    { id: "capacitor_1", type: "capacitor", capacitance: 100, connects_to: ["battery_1"] },
  ],
});
check("RC circuit solves without error (τ > 0)", !rcCircuit.note && rcCircuit.componentStates.some(s => s && s.tau > 0));

const diodeCircuit = solveCircuit({
  topology: "series",
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["diode_1"] },
    { id: "diode_1", type: "diode", connects_to: ["resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 470, connects_to: ["battery_1"] },
  ],
});
check("diode applies 0.7V forward drop", approx(diodeCircuit.current, (9 - 0.7) / 470, 0.001));

// ─── Sanity limits exposed ─────────────────────────────────────────────
check("sanity limits published", SANITY_LIMITS.resistance.max === 10000 && SANITY_LIMITS.voltage.max === 100);

// ─── Natural-language command parser ───────────────────────────────────
section("Text command parser");
const circuit = {
  components: [
    { id: "battery_1", type: "battery", voltage: 9 },
    { id: "resistor_1", type: "resistor", resistance: 100 },
    { id: "switch_1", type: "switch", state: "open" },
  ],
};
check("parse 'set resistance to 220'", (() => {
  const r = parseCommand("set resistance to 220", circuit);
  return r.recognized && r.field === "resistance" && r.newValue === 220;
})());
check("parse 'close the switch'", (() => {
  const r = parseCommand("close the switch", circuit);
  return r.recognized && r.field === "state" && r.newValue === "closed";
})());
check("parse 'increase voltage to 12V'", (() => {
  const r = parseCommand("increase voltage to 12V", circuit);
  return r.recognized && r.field === "voltage" && r.newValue === 12;
})());
check("unit shorthand '2.2k' → 2200", parseNumberValue("2.2k") === 2200);
check("garbage input not recognized", parseCommand("hello there", circuit).recognized === false);

// ─── Recognition type-parity guard ─────────────────────────────────────
// The vision prompt and the solver both support capacitor + diode. If the
// recognition route's allowlist ever drifts from them, photographed RC /
// diode circuits silently fail with a 422. This guards against that.
section("Recognition parity");
const recognizeSrc = fs.readFileSync(path.join(__dirname, "routes", "recognize.js"), "utf8");
check("recognizer allowlist includes capacitor", recognizeSrc.includes('"capacitor"'));
check("recognizer allowlist includes diode", recognizeSrc.includes('"diode"'));

// ─── Summary ───────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${"─".repeat(40)}\n`);

process.exit(failed === 0 ? 0 : 1);
