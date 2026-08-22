const { parseCircuitRecognitionResponse, RECOGNITION_PROMPT } = require("../lib/prompts");
const { solveCircuit } = require("../lib/circuitSolver");
const { callVisionModel } = require("../lib/visionModel");

console.log("=== Testing parseCircuitRecognitionResponse ===");

const rawSample1 = `\`\`\`json
{
  "topology": "series",
  "parallel_groups": [],
  "components": [
    {"id": "battery_1", "type": "battery", "voltage": 9, "connects_to": ["resistor_1"]},
    {"id": "resistor_1", "type": "resistor", "resistance": 100, "connects_to": ["battery_1"]}
  ]
}
\`\`\``;

const result1 = parseCircuitRecognitionResponse(rawSample1);
console.log("Sample 1 (code fence) Success:", result1.success, "Topology:", result1.data?.topology);

const rawSample2 = `Here is the recognized circuit diagram:
\`\`\`json
{
  "topology": "series_parallel",
  "parallel_groups": [["bulb_1", "resistor_1"]],
  "components": [
    {"id": "battery_1", "type": "battery", "voltage": 12, "connects_to": ["bulb_1"]},
    {"id": "bulb_1", "type": "bulb", "resistance": 50, "connects_to": ["battery_1", "resistor_2"]},
    {"id": "resistor_1", "type": "resistor", "resistance": 50, "connects_to": ["battery_1", "resistor_2"]},
    {"id": "resistor_2", "type": "resistor", "resistance": 100, "connects_to": ["bulb_1", "battery_1"]}
  ]
}
\`\`\`
Hope this helps!`;

const result2 = parseCircuitRecognitionResponse(rawSample2);
console.log("Sample 2 (text + code fence) Success:", result2.success, "Groups:", result2.data?.parallel_groups);

const rawSample3 = "This is not valid JSON at all.";
const result3 = parseCircuitRecognitionResponse(rawSample3);
console.log("Sample 3 (invalid) Success:", result3.success, "Error:", result3.error);

console.log("\n=== Testing solveCircuit with recognized data ===");
const solved1 = solveCircuit(result1.data);
console.log("Solved 1 Total Current:", solved1.current, "Resistance:", solved1.totalResistance);

const solved2 = solveCircuit(result2.data);
console.log("Solved 2 Total Current:", solved2.current, "Resistance:", solved2.totalResistance);

console.log("\n=== Testing callVisionModel error handling when key is placeholder ===");
callVisionModel("dummy", "dummy prompt").catch(err => {
  console.log("Expected error caught successfully:", err.message);
});
