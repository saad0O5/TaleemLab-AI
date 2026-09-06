/**
 * POST /api/solve-circuit — Solve a circuit and return computed values
 */
const { solveCircuit } = require("../lib/circuitSolver");

async function handleSolve(req, res, { parseRequestBody, sendJSON }) {
  try {
    const body = await parseRequestBody(req);
    const circuitData = body.circuit || body;

    if (!circuitData || !circuitData.components || !circuitData.topology) {
      return sendJSON(res, 400, {
        error: "invalid_circuit_payload",
        message: "Request body must be a valid circuit object containing 'topology' and 'components'."
      });
    }

    const result = solveCircuit(circuitData);
    return sendJSON(res, 200, result);
  } catch (err) {
    console.error("Solve route error:", err);
    return sendJSON(res, 500, {
      error: "solver_error",
      message: "An internal error occurred while solving the circuit."
    });
  }
}

module.exports = { handleSolve };
