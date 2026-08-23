require("dotenv").config();
const fs = require("fs");
const path = require("path");
const server = require("./server");

const TEST_PORT = 3008;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Sample test circuit
const baseCircuit = {
  topology: "series",
  parallel_groups: [],
  components: [
    { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["switch_1", "resistor_1"] },
    { id: "switch_1", type: "switch", state: "closed", connects_to: ["battery_1", "resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["battery_1", "switch_1"] }
  ]
};

async function runTests() {
  console.log("==================================================================");
  console.log("             TaleemLab API Comprehensive Test Suite               ");
  console.log("==================================================================");

  // -------------------------------------------------------------------------
  // TEST 1: POST /api/recognize-circuit
  // -------------------------------------------------------------------------
  console.log("\n[TEST 1] Testing POST /api/recognize-circuit...");
  const imagePath = path.join(__dirname, "test-images", "capture3.jpeg");
  if (fs.existsSync(imagePath)) {
    const imgBuf = fs.readFileSync(imagePath);
    const base64Data = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;
    
    try {
      const res = await fetch(`${BASE_URL}/api/recognize-circuit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data })
      });
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        console.log("✅ Circuit Recognized successfully:");
        console.log(`- Topology: ${data.topology}`);
        console.log(`- Components detected (${data.components?.length || 0}):`, data.components?.map(c => `${c.id} (${c.type})`).join(", "));
      } else {
        console.log("Vision Response / Error details:", data);
      }
    } catch (err) {
      console.error("❌ Recognize Circuit error:", err.message);
    }
  } else {
    console.log("⚠️ No test image found in test-images/capture3.jpeg, skipping live image call.");
  }

  // -------------------------------------------------------------------------
  // TEST 2: POST /api/solve-circuit
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing POST /api/solve-circuit...");
  try {
    const res = await fetch(`${BASE_URL}/api/solve-circuit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseCircuit)
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Output:", {
      current: `${data.current} A`,
      voltage: `${data.voltage} V`,
      totalResistance: `${data.totalResistance} Ω`,
      componentCount: data.componentStates?.length
    });
    if (data.current === 0.09 && data.totalResistance === 100) {
      console.log("✅ /api/solve-circuit passed verification.");
    } else {
      console.error("❌ /api/solve-circuit unexpected values:", data);
    }
  } catch (err) {
    console.error("❌ Solve Circuit error:", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: POST /api/apply-change
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing POST /api/apply-change (resistor_1: 100Ω -> 200Ω)...");
  try {
    const res = await fetch(`${BASE_URL}/api/apply-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        circuit: baseCircuit,
        componentId: "resistor_1",
        field: "resistance",
        newValue: 200
      })
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Output:", {
      current: `${data.current} A`,
      voltage: `${data.voltage} V`,
      totalResistance: `${data.totalResistance} Ω`,
      explanation: data.explanation
    });

    const expectedExplanation = "Resistance increased, so current decreased (Ohm's Law: I = V/R).";
    if (data.current === 0.045 && data.totalResistance === 200 && data.explanation === expectedExplanation) {
      console.log("✅ /api/apply-change passed verification with exact explanation.");
    } else {
      console.error("❌ /api/apply-change verification failed:", data);
    }
  } catch (err) {
    console.error("❌ Apply Change error:", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: POST /api/text-command
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Testing POST /api/text-command with 3 distinct phrases...");

  // Phrase A: Should Match ("increase resistance to 200")
  console.log('\n  -> Phrase A (Should match): "increase resistance to 200"');
  try {
    const res = await fetch(`${BASE_URL}/api/text-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        circuit: baseCircuit,
        text: "increase resistance to 200"
      })
    });
    const data = await res.json();
    console.log(`     Status: ${res.status}`);
    console.log(`     Current: ${data.current} A, Resistance: ${data.totalResistance} Ω`);
    console.log(`     Explanation: "${data.explanation}"`);
    if (data.current === 0.045 && data.explanation === "Resistance increased, so current decreased (Ohm's Law: I = V/R).") {
      console.log("     ✅ Phrase A passed.");
    } else {
      console.error("     ❌ Phrase A failed:", data);
    }
  } catch (err) {
    console.error("     ❌ Phrase A error:", err.message);
  }

  // Phrase B: Edge Case ("close switch" on an open circuit)
  console.log('\n  -> Phrase B (Edge case): "close switch" on an open circuit');
  const openCircuit = {
    ...baseCircuit,
    components: baseCircuit.components.map(c => c.id === "switch_1" ? { ...c, state: "open" } : { ...c })
  };
  try {
    const res = await fetch(`${BASE_URL}/api/text-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        circuit: openCircuit,
        text: "close switch"
      })
    });
    const data = await res.json();
    console.log(`     Status: ${res.status}`);
    console.log(`     Current: ${data.current} A, Switch State: closed`);
    console.log(`     Explanation: "${data.explanation}"`);
    if (data.current === 0.09 && data.explanation === "The circuit is now closed — current flows again.") {
      console.log("     ✅ Phrase B passed.");
    } else {
      console.error("     ❌ Phrase B failed:", data);
    }
  } catch (err) {
    console.error("     ❌ Phrase B error:", err.message);
  }

  // Phrase C: Should NOT Match ("make it brighter")
  console.log('\n  -> Phrase C (Should NOT match): "make it brighter"');
  try {
    const res = await fetch(`${BASE_URL}/api/text-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        circuit: baseCircuit,
        text: "make it brighter"
      })
    });
    const data = await res.json();
    console.log(`     Status: ${res.status}`);
    console.log("     Response:", data);
    if (data.recognized === false) {
      console.log("     ✅ Phrase C correctly returned { recognized: false }.");
    } else {
      console.error("     ❌ Phrase C failed (unexpected match):", data);
    }
  } catch (err) {
    console.error("     ❌ Phrase C error:", err.message);
  }

  console.log("\n==================================================================");
  console.log("                   Test Suite Execution Finished                  ");
  console.log("==================================================================\n");
}

server.listen(TEST_PORT, async () => {
  try {
    await runTests();
  } finally {
    server.close();
  }
});
