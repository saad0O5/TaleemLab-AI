/**
 * POST /api/text-command — Parse a natural-language command and apply it
 */
const { parseCommand } = require("../lib/textCommandParser");
const { solveCircuit } = require("../lib/circuitSolver");
const { explainChange } = require("../lib/explanations");
const { validateFieldChange, validateCircuitPayload } = require("../lib/validation");

/**
 * Apply a modification to a component field on a copy of the circuit and solve.
 * (Shared logic — same as applyChange but kept local to avoid cross-route coupling)
 */
function applyCircuitChange(circuit, componentId, field, newValue) {
  if (!circuit || !Array.isArray(circuit.components)) {
    throw new Error("Invalid circuit payload: 'components' array is required.");
  }

  const targetComponent = circuit.components.find(c => c.id === componentId);
  if (!targetComponent) {
    const error = new Error(`Component '${componentId}' was not found in circuit.`);
    error.code = "component_not_found";
    throw error;
  }

  const oldValue = targetComponent[field];
  const originalResult = solveCircuit(circuit);
  const oldCurrent = originalResult.current;

  const updatedCircuit = {
    ...circuit,
    parallel_groups: circuit.parallel_groups ? circuit.parallel_groups.map(g => [...g]) : [],
    components: circuit.components.map(c => {
      if (c.id === componentId) {
        return { ...c, [field]: newValue };
      }
      return { ...c };
    })
  };

  const solverResult = solveCircuit(updatedCircuit);
  const newCurrent = solverResult.current;
  const explanation = explainChange(field, oldValue, newValue, { oldCurrent, newCurrent });

  return { ...solverResult, explanation };
}

async function handleTextCommand(req, res, { parseRequestBody, sendJSON }) {
  try {
    const body = await parseRequestBody(req);
    const { circuit, text } = body || {};

    // Validate circuit payload
    const circuitCheck = validateCircuitPayload(circuit);
    if (!circuitCheck.valid) {
      return sendJSON(res, 400, { error: circuitCheck.error, message: circuitCheck.message });
    }

    if (!text || typeof text !== "string") {
      return sendJSON(res, 400, {
        error: "missing_text",
        message: "Request body must contain a 'text' command string."
      });
    }

    const parsedCmd = parseCommand(text, circuit);
    if (!parsedCmd || parsedCmd.recognized === false) {
      return sendJSON(res, 200, { recognized: false });
    }

    const { componentId, field, newValue } = parsedCmd;

    // Validate against SANITY_LIMITS before solving
    const fieldCheck = validateFieldChange(field, newValue);
    if (!fieldCheck.valid) {
      return sendJSON(res, 400, { error: fieldCheck.error, message: fieldCheck.message });
    }

    const result = applyCircuitChange(circuit, componentId, field, newValue);
    return sendJSON(res, 200, {
      ...result,
      appliedChange: { componentId, field, newValue }
    });
  } catch (err) {
    if (err.code === "component_not_found") {
      return sendJSON(res, 400, {
        error: "component_not_found",
        message: err.message
      });
    }
    console.error("Text-command route error:", err);
    return sendJSON(res, 500, {
      error: "text_command_error",
      message: "An internal error occurred while processing the command."
    });
  }
}

module.exports = { handleTextCommand };
