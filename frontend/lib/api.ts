import { CircuitData, SolverResult } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function postJSON<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errMsg = `API error: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) {
        errMsg = errJson.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

export async function recognizeCircuit(imageBase64: string): Promise<CircuitData> {
  return postJSON<CircuitData>("/api/recognize-circuit", { imageBase64 });
}

export async function solveCircuit(circuit: CircuitData): Promise<SolverResult> {
  return postJSON<SolverResult>("/api/solve-circuit", { circuit });
}

export async function applyChange(
  circuit: CircuitData,
  componentId: string,
  field: string,
  newValue: any
): Promise<SolverResult> {
  return postJSON<SolverResult>("/api/apply-change", { circuit, componentId, field, newValue });
}

export async function sendTextCommand(
  circuit: CircuitData,
  text: string
): Promise<SolverResult | { recognized: false }> {
  return postJSON<SolverResult | { recognized: false }>("/api/text-command", { circuit, text });
}
