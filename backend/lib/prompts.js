const { parseJsonResponse } = require("./gemini");

const RECOGNITION_PROMPT = `You are analyzing a hand-drawn DC electrical circuit diagram from a student's notebook.
Identify all components (battery, resistor, switch, bulb, ammeter, voltmeter) and their
electrical connections. Assign each component an id in the format "type_number" (e.g.
battery_1, resistor_1, bulb_1) — number sequentially starting at 1 for each type.

Beyond recognizing components, also infer the EDUCATIONAL CONTEXT — what the student
is likely trying to learn or experiment with based on the circuit they drew.

Return ONLY valid JSON in this exact schema, no explanation text:

{
  "topology": "series" or "series_parallel",
  "parallel_groups": [["id1","id2"], ...] or [] if none,
  "components": [
    {"id": "string", "type": "battery|resistor|switch|bulb|ammeter|voltmeter",
     "voltage": number (battery only),
     "polarity": "same" or "reversed" (battery only, ONLY if you are confident of
       the orientation from the symbol; if uncertain or if multiple batteries are
       present, omit this field entirely rather than guessing),
     "resistance": number (resistor and bulb only; if a bulb has no resistance
       labeled, return 0),
     "state": "open"|"closed" (switch only),
     "connects_to": ["id1","id2"]}
  ],
  "uncertain_fields": ["component_id.field_name", ...] or [] if all values are clear,
  "educational_context": {
    "likely_topic": "string — the likely physics topic (e.g. Ohm's Law, Series Circuits, Parallel Resistance, Switch Control)",
    "intent": "string — one sentence describing what the student appears to be trying to build or explore",
    "observations": ["string — positive observations about the drawing, e.g. Complete loop, Values clearly labeled"],
    "concerns": ["string — any issues or ambiguities, e.g. Resistor value unclear, No return path visible"] or []
  }
}

The "uncertain_fields" array should contain dot-notation paths (e.g. "battery_1.voltage",
"resistor_1.resistance") for any value you are genuinely unsure about reading clearly
from the image. If confident in all readings, return an empty array.

Rules:
- If any resistors, bulbs, or voltmeters are connected in parallel (sharing the
  same two connection points), list their ids together in "parallel_groups". A
  voltmeter should be grouped with whichever component it is measuring.
- Normalize unit shorthand: "1k" or "1kOhm" means 1000, "2.2k" means 2200.
- A resistor drawn with an arrow through it (a rheostat/variable resistor) should
  still be returned as type "resistor" — its resistance is adjustable, but the
  underlying representation is the same.
- If multiple batteries are detected, do not guess polarity/orientation — omit
  the "polarity" field for each and let the app ask the student to confirm.
- Every component must have at least one entry in "connects_to". If a component
  appears genuinely disconnected in the drawing, still list its nearest visible
  connection point as a best-effort guess rather than leaving it empty.
- For "educational_context.observations", include at least 1-2 positive observations.
- For "educational_context.concerns", only include genuine issues. Return empty array if none.`;

/**
 * Clean markdown fences and parse model response as JSON
 * Uses the shared parseJsonResponse from gemini.js
 *
 * @param {string} rawText
 * @returns {{ success: boolean, data?: object, raw: string, error?: string }}
 */
function parseCircuitRecognitionResponse(rawText) {
  const result = parseJsonResponse(rawText);

  // Additional validation: ensure required fields exist
  if (result.success && result.data) {
    if (!result.data.components) {
      return {
        success: false,
        error: "missing_components",
        raw: rawText,
      };
    }
    if (!result.data.topology) {
      return {
        success: false,
        error: "missing_topology",
        raw: rawText,
      };
    }
    // Ensure educational_context exists (even if empty)
    if (!result.data.educational_context) {
      result.data.educational_context = {
        likely_topic: "DC Circuits",
        intent: "Exploring electrical circuits",
        observations: [],
        concerns: [],
      };
    }
  }

  return result;
}

module.exports = {
  RECOGNITION_PROMPT,
  parseCircuitRecognitionResponse,
};
