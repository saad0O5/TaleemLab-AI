const { solveCircuit } = require("../../lib/circuitSolver");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const circuitData = req.body?.circuit || req.body;
    if (!circuitData || !circuitData.components || !circuitData.topology) {
      return res.status(400).json({
        error: "invalid_circuit_payload",
        message: "Request body must be a valid circuit object with 'topology' and 'components'."
      });
    }

    const result = solveCircuit(circuitData);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: "solver_error",
      message: err.message
    });
  }
}
