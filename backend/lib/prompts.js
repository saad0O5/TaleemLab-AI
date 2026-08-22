const RECOGNITION_PROMPT = `You are analyzing a hand-drawn DC electrical circuit diagram from a student's notebook.
Identify all components (battery, resistor, switch, bulb, ammeter, voltmeter) and their
electrical connections. Assign each component an id in the format "type_number" (e.g.
battery_1, resistor_1, bulb_1) — number sequentially starting at 1 for each type.

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
  ]
}

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
  connection point as a best-effort guess rather than leaving it empty.`;

/**
 * Clean markdown fences and parse model response as JSON
 * @param {string} rawText 
 * @returns {{ success: boolean, data?: object, raw: string, error?: string }}
 */
function parseCircuitRecognitionResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return {
      success: false,
      error: "recognition_parse_failed",
      raw: String(rawText)
    };
  }

  // Strip markdown code fences if present
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Also check if JSON is wrapped inside text with ```json ... ``` somewhere
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      success: true,
      data: parsed,
      raw: rawText
    };
  } catch (err) {
    return {
      success: false,
      error: "recognition_parse_failed",
      raw: rawText,
      message: err.message
    };
  }
}

module.exports = {
  RECOGNITION_PROMPT,
  parseCircuitRecognitionResponse
};
