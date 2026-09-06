/**
 * POST /api/apply-change — Apply a component modification and re-solve
 */
const { solveCircuit } = require("../lib/circuitSolver");
const { explainChange } = require("../lib/explanations");
const { validateFieldChange, validateCircuitPayload } = require("../lib/validation");

/**
 * Apply a modification to a component field on a copy of the circuit and solve.
 * @param {object} circuit
 * @param {string} componentId
 * @param {string} field
 * @param {any} newValue
 * @returns {object} Solver output with rule-based explanation
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

  // Solve the original circuit to get the old current for context
  const originalResult = solveCircuit(circuit);
  const oldCurrent = originalResult.current;

  // Create deep copy of circuit to ensure immutability
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

  return {
    ...solverResult,
    explanation
  };
}

async function handleApplyChange(req, res, { parseRequestBody, sendJSON }) {
  try {
    const body = await parseRequestBody(req);
    const { circuit, componentId, field, newValue } = body || {};

    // Validate circuit payload
    const circuitCheck = validateCircuitPayload(circuit);
    if (!circuitCheck.valid) {
      return sendJSON(res, 400, { error: circuitCheck.error, message: circuitCheck.message });
    }

    if (!componentId || typeof componentId !== "string") {
      return sendJSON(res, 400, {
        error: "missing_component_id",
        message: "Request body must contain a string 'componentId'."
      });
    }

    if (!field || typeof field !== "string") {
      return sendJSON(res, 400, {
        error: "missing_field",
        message: "Request body must contain a string 'field' to update."
      });
    }

    if (newValue === undefined) {
      return sendJSON(res, 400, {
        error: "missing_new_value",
        message: "Request body must contain 'newValue'."
      });
    }

    // Validate against SANITY_LIMITS before solving
    const fieldCheck = validateFieldChange(field, newValue);
    if (!fieldCheck.valid) {
      return sendJSON(res, 400, { error: fieldCheck.error, message: fieldCheck.message });
    }

    const result = applyCircuitChange(circuit, componentId, field, newValue);
    return sendJSON(res, 200, result);
  } catch (err) {
    if (err.code === "component_not_found") {
      return sendJSON(res, 400, {
        error: "component_not_found",
        message: err.message
      });
    }
    console.error("Apply-change route error:", err);
    return sendJSON(res, 500, {
      error: "apply_change_error",
      message: "An internal error occurred while applying the change."
    });
  }
}

module.exports = { handleApplyChange };
