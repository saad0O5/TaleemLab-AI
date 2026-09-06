/**
 * Shared input validation for circuit field changes.
 * Used by both apply-change and text-command routes.
 */

const { SANITY_LIMITS } = require("../lib/circuitSolver");

/**
 * Validate a field change value against sanity limits.
 * @param {string} field - "resistance" | "voltage" | other
 * @param {any} newValue - The proposed value
 * @returns {{ valid: boolean, error?: string, message?: string }}
 */
function validateFieldChange(field, newValue) {
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

/**
 * Validate that a circuit object has the minimum required fields.
 * @param {object} circuit
 * @returns {{ valid: boolean, error?: string, message?: string }}
 */
function validateCircuitPayload(circuit) {
  if (!circuit || !circuit.components || !circuit.topology) {
    return {
      valid: false,
      error: "invalid_circuit_payload",
      message: "Request body must contain a valid 'circuit' object with 'topology' and 'components'."
    };
  }
  return { valid: true };
}

module.exports = { validateFieldChange, validateCircuitPayload };
