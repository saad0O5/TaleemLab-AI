/**
 * Text Command Parser for DC Circuit Modifications
 * Uses regex/keyword matching (deterministic, no live AI call)
 */

/**
 * Helper to parse numbers with unit shorthand (e.g. "1k" -> 1000, "2.2k" -> 2200, "12V" -> 12)
 * @param {string} valStr 
 * @returns {number|null}
 */
function parseNumberValue(valStr) {
  if (!valStr) return null;
  const trimmed = valStr.trim().toLowerCase();

  // Check for k / kohm suffix like "1k", "2.2k", "1kohm"
  const kMatch = trimmed.match(/^(-?[0-9]+(?:\.[0-9]+)?)\s*k(?:ohm|ohms|Ω)?$/i);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }

  // Check for standard number (strip trailing v, volt, volts, ohm, ohms, Ω)
  const numMatch = trimmed.match(/^(-?[0-9]+(?:\.[0-9]+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return null;
}

/**
 * Helper to find explicit component ID mentioned in text (e.g., "resistor_2", "battery_1", "switch_1")
 * @param {string} text 
 * @param {string} typePrefix 
 * @returns {string|null}
 */
function findExplicitComponentId(text, typePrefix) {
  const regex = new RegExp(`\\b(${typePrefix}_?\\d+)\\b`, "i");
  const match = text.match(regex);
  if (match) {
    // Normalize format e.g. "resistor1" -> "resistor_1"
    const matched = match[1].toLowerCase();
    if (matched.includes("_")) return matched;
    return matched.replace(new RegExp(`^${typePrefix}(\\d+)`, "i"), `${typePrefix}_$1`);
  }
  return null;
}

/**
 * Parse natural language text command and extract circuit modification
 * 
 * @param {string} text - User command text
 * @param {object} [circuit] - Optional circuit object to resolve default component IDs
 * @returns {{ recognized: false } | { recognized: true, componentId: string, field: string, newValue: any }}
 */
function parseCommand(text, circuit = null) {
  if (!text || typeof text !== "string") {
    return { recognized: false };
  }

  const cleanText = text.trim().toLowerCase();
  const components = circuit && Array.isArray(circuit.components) ? circuit.components : [];

  const getFirstComponentId = (type, fallbackId) => {
    const found = components.find(c => c.type === type);
    return found ? found.id : fallbackId;
  };

  // 1. Switch open/close patterns
  // "open switch", "open the switch", "turn off switch", "turn switch off", "open switch_1"
  if (/\b(?:open|turn\s*off)\b.*\bswitch\b|\bswitch\b.*\b(?:open|off)\b/i.test(cleanText)) {
    const targetId = findExplicitComponentId(cleanText, "switch") || getFirstComponentId("switch", "switch_1");
    return {
      recognized: true,
      componentId: targetId,
      field: "state",
      newValue: "open"
    };
  }

  // "close switch", "close the switch", "turn on switch", "turn switch on", "close switch_1"
  if (/\b(?:close|closed|turn\s*on)\b.*\bswitch\b|\bswitch\b.*\b(?:close|closed|on)\b/i.test(cleanText)) {
    const targetId = findExplicitComponentId(cleanText, "switch") || getFirstComponentId("switch", "switch_1");
    return {
      recognized: true,
      componentId: targetId,
      field: "state",
      newValue: "closed"
    };
  }

  // 2. Resistance patterns: "set/increase/decrease resistance to [number]"
  const resistanceMatch = cleanText.match(/\b(?:set|increase|decrease|change|make|adjust)\b.*?(?:resistance|resistor|\br\b)(?:.*?\b(?:of|for)\b\s*([a-z0-9_]+))?.*?(?:to|at|by|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:k(?:ohm|ohms|Ω)?|ohm|ohms|Ω)?)/i)
    || cleanText.match(/(?:resistance|resistor)\s*(?:of\s*([a-z0-9_]+)\s*)?(?:to|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:k(?:ohm|ohms|Ω)?|ohm|ohms|Ω)?)/i);

  if (resistanceMatch) {
    const rawVal = resistanceMatch[2] || resistanceMatch[1];
    const explicitCandidate = resistanceMatch[1];
    const explicitId = explicitCandidate && components.some(c => c.id === explicitCandidate) ? explicitCandidate : null;
    const num = parseNumberValue(rawVal);
    if (num !== null && !isNaN(num)) {
      const targetId = explicitId || findExplicitComponentId(cleanText, "resistor") || getFirstComponentId("resistor", "resistor_1");
      return {
        recognized: true,
        componentId: targetId,
        field: "resistance",
        newValue: num
      };
    }
  }

  // 3. Voltage patterns: "set/increase/decrease voltage to [number]"
  const voltageMatch = cleanText.match(/\b(?:set|increase|decrease|change|make|adjust)\b.*?(?:voltage|battery|\bv\b)(?:.*?\b(?:of|for)\b\s*([a-z0-9_]+))?.*?(?:to|at|by|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:v|volts|volt)?)/i)
    || cleanText.match(/(?:voltage|battery)\s*(?:of\s*([a-z0-9_]+)\s*)?(?:to|=)\s*(-?[0-9]+(?:\.[0-9]+)?\s*(?:v|volts|volt)?)/i);

  if (voltageMatch) {
    const rawVal = voltageMatch[2] || voltageMatch[1];
    const explicitCandidate = voltageMatch[1];
    const explicitId = explicitCandidate && components.some(c => c.id === explicitCandidate) ? explicitCandidate : null;
    const num = parseNumberValue(rawVal);
    if (num !== null && !isNaN(num)) {
      const targetId = explicitId || findExplicitComponentId(cleanText, "battery") || getFirstComponentId("battery", "battery_1");
      return {
        recognized: true,
        componentId: targetId,
        field: "voltage",
        newValue: num
      };
    }
  }

  return { recognized: false };
}

module.exports = {
  parseCommand,
  parseNumberValue
};
