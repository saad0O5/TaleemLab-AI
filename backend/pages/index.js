import { useState } from "react";
import Head from "next/head";

const SAMPLE_CIRCUITS = {
  series: {
    topology: "series",
    parallel_groups: [],
    components: [
      { id: "battery_1", type: "battery", voltage: 9, polarity: "same", connects_to: ["switch_1", "resistor_2"] },
      { id: "switch_1", type: "switch", state: "closed", connects_to: ["battery_1", "resistor_1"] },
      { id: "resistor_1", type: "resistor", resistance: 100, connects_to: ["switch_1", "resistor_2"] },
      { id: "resistor_2", type: "resistor", resistance: 200, connects_to: ["resistor_1", "battery_1"] }
    ]
  },
  series_parallel: {
    topology: "series_parallel",
    parallel_groups: [["bulb_1", "resistor_1"]],
    components: [
      { id: "battery_1", type: "battery", voltage: 12, polarity: "same", connects_to: ["switch_1", "bulb_1"] },
      { id: "switch_1", type: "switch", state: "closed", connects_to: ["battery_1", "bulb_1"] },
      { id: "bulb_1", type: "bulb", resistance: 50, connects_to: ["switch_1", "resistor_2"] },
      { id: "resistor_1", type: "resistor", resistance: 50, connects_to: ["switch_1", "resistor_2"] },
      { id: "resistor_2", type: "resistor", resistance: 100, connects_to: ["bulb_1", "battery_1"] }
    ]
  }
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [recognitionError, setRecognitionError] = useState(null);

  const [circuitJsonInput, setCircuitJsonInput] = useState(
    JSON.stringify(SAMPLE_CIRCUITS.series, null, 2)
  );
  const [solving, setSolving] = useState(false);
  const [solverResult, setSolverResult] = useState(null);
  const [solverError, setSolverError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRecognize = async () => {
    if (!previewUrl) return;
    setRecognizing(true);
    setRecognitionResult(null);
    setRecognitionError(null);

    try {
      const res = await fetch("/api/recognize-circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: previewUrl })
      });

      const data = await res.json();
      if (!res.ok) {
        setRecognitionError(data);
      } else {
        setRecognitionResult(data);
        setCircuitJsonInput(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setRecognitionError({ error: "network_error", message: err.message });
    } finally {
      setRecognizing(false);
    }
  };

  const handleSolve = async () => {
    setSolving(true);
    setSolverResult(null);
    setSolverError(null);

    try {
      const parsedCircuit = JSON.parse(circuitJsonInput);
      const res = await fetch("/api/solve-circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedCircuit)
      });

      const data = await res.json();
      if (!res.ok) {
        setSolverError(data);
      } else {
        setSolverResult(data);
      }
    } catch (err) {
      setSolverError({ error: "invalid_input", message: err.message });
    } finally {
      setSolving(false);
    }
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>TaleemLab — AI DC Circuit Simulator Backend</title>
        <meta name="description" content="AI-read, interactive DC physics circuit simulation" />
      </Head>

      <header style={styles.header}>
        <div style={styles.badge}>Day 1 Backend Active</div>
        <h1 style={styles.title}>⚡ TaleemLab Backend & Simulation Engine</h1>
        <p style={styles.subtitle}>
          AI Hand-Drawn Circuit Recognition (Gemini Vision) &amp; Deterministic DC Circuit Solver
        </p>
      </header>

      <main style={styles.grid}>
        {/* Step 1: Vision Recognition */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.stepNum}>1</span>
            <h2>Recognize Circuit (Vision AI)</h2>
          </div>
          <p style={styles.cardDesc}>
            Upload a photo of a hand-drawn circuit or test with sample images via <code>POST /api/recognize-circuit</code>.
          </p>

          <div style={styles.uploadArea}>
            <input
              type="file"
              accept="image/*"
              id="circuit-file-input"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <label htmlFor="circuit-file-input" style={styles.fileLabel}>
              {selectedFile ? `Selected: ${selectedFile.name}` : "📁 Choose Circuit Image"}
            </label>

            {previewUrl && (
              <div style={styles.previewContainer}>
                <img src={previewUrl} alt="Circuit Preview" style={styles.previewImage} />
              </div>
            )}

            <button
              onClick={handleRecognize}
              disabled={!previewUrl || recognizing}
              style={{
                ...styles.button,
                opacity: !previewUrl || recognizing ? 0.6 : 1
              }}
            >
              {recognizing ? "🔄 Analyzing with Gemini..." : "⚡ Run Vision Recognition"}
            </button>
          </div>

          {recognitionError && (
            <div style={styles.errorBox}>
              <strong>Recognition Error:</strong>
              <pre style={styles.pre}>{JSON.stringify(recognitionError, null, 2)}</pre>
            </div>
          )}

          {recognitionResult && (
            <div style={styles.resultBox}>
              <div style={styles.resultHeader}>
                <strong>Recognized Circuit Schema:</strong>
                <span style={styles.successTag}>Parsed JSON</span>
              </div>
              <pre style={styles.pre}>{JSON.stringify(recognitionResult, null, 2)}</pre>
            </div>
          )}
        </section>

        {/* Step 2: Circuit Solver */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.stepNum}>2</span>
            <h2>Circuit Solver &amp; Physics Simulation</h2>
          </div>
          <p style={styles.cardDesc}>
            Calculate current, voltages, bulb brightness, and verify safety flags via <code>POST /api/solve-circuit</code>.
          </p>

          <div style={styles.presetButtons}>
            <button
              onClick={() => setCircuitJsonInput(JSON.stringify(SAMPLE_CIRCUITS.series, null, 2))}
              style={styles.presetBtn}
            >
              Load Series Preset
            </button>
            <button
              onClick={() => setCircuitJsonInput(JSON.stringify(SAMPLE_CIRCUITS.series_parallel, null, 2))}
              style={styles.presetBtn}
            >
              Load Series-Parallel Preset
            </button>
          </div>

          <textarea
            value={circuitJsonInput}
            onChange={(e) => setCircuitJsonInput(e.target.value)}
            style={styles.textarea}
            rows={12}
          />

          <button
            onClick={handleSolve}
            disabled={solving}
            style={styles.button}
          >
            {solving ? "🔄 Solving Circuit..." : "🔬 Solve Circuit"}
          </button>

          {solverError && (
            <div style={styles.errorBox}>
              <strong>Solver Error:</strong>
              <pre style={styles.pre}>{JSON.stringify(solverError, null, 2)}</pre>
            </div>
          )}

          {solverResult && (
            <div style={styles.resultBox}>
              <div style={styles.resultHeader}>
                <strong>Solver Output:</strong>
                <span style={styles.successTag}>Simulated</span>
              </div>
              <div style={styles.metricsRow}>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Total Current</div>
                  <div style={styles.metricVal}>{solverResult.current} A</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Total Voltage</div>
                  <div style={styles.metricVal}>{solverResult.voltage} V</div>
                </div>
                <div style={styles.metric}>
                  <div style={styles.metricLabel}>Total Resistance</div>
                  <div style={styles.metricVal}>
                    {solverResult.totalResistance !== null ? `${solverResult.totalResistance} Ω` : "N/A"}
                  </div>
                </div>
              </div>

              {solverResult.flags && solverResult.flags.length > 0 && (
                <div style={styles.flagsBox}>
                  <strong>Flags: </strong>
                  {solverResult.flags.map((f, i) => (
                    <span key={i} style={styles.flagBadge}>
                      {typeof f === "object" ? `${f.type}: ${f.componentId}` : f}
                    </span>
                  ))}
                </div>
              )}

              {solverResult.note && (
                <div style={styles.noteBox}>
                  ℹ️ {solverResult.note}
                </div>
              )}

              <pre style={styles.pre}>{JSON.stringify(solverResult, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 20px",
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    minHeight: "100vh"
  },
  header: {
    marginBottom: "32px",
    textAlign: "center"
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    padding: "4px 12px",
    borderRadius: "9999px",
    marginBottom: "12px"
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#0f172a",
    margin: "0 0 8px 0"
  },
  subtitle: {
    fontSize: "16px",
    color: "#64748b",
    margin: 0
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
    gap: "24px"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px"
  },
  stepNum: {
    backgroundColor: "#2563eb",
    color: "#fff",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "14px"
  },
  cardDesc: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 16px 0"
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "16px"
  },
  fileLabel: {
    display: "block",
    textAlign: "center",
    padding: "16px",
    border: "2px dashed #cbd5e1",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#f8fafc",
    fontWeight: "600",
    color: "#334155"
  },
  previewContainer: {
    textAlign: "center",
    maxHeight: "220px",
    overflow: "hidden",
    borderRadius: "8px",
    border: "1px solid #e2e8f0"
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "220px",
    objectFit: "contain"
  },
  button: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    transition: "background-color 0.2s"
  },
  presetButtons: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px"
  },
  presetBtn: {
    backgroundColor: "#f1f5f9",
    border: "1px solid #cbd5e1",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    color: "#334155"
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "monospace",
    fontSize: "13px",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    marginBottom: "12px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0"
  },
  resultBox: {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0"
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  successTag: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "4px"
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "12px"
  },
  metric: {
    backgroundColor: "#ffffff",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    textAlign: "center"
  },
  metricLabel: {
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase"
  },
  metricVal: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "4px"
  },
  flagsBox: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "8px"
  },
  flagBadge: {
    display: "inline-block",
    backgroundColor: "#fde68a",
    padding: "2px 6px",
    borderRadius: "4px",
    marginRight: "4px",
    fontSize: "12px",
    fontWeight: "600"
  },
  noteBox: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "8px"
  },
  errorBox: {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5"
  },
  pre: {
    fontFamily: "monospace",
    fontSize: "12px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: "12px",
    borderRadius: "6px",
    overflowX: "auto",
    maxHeight: "260px",
    margin: "8px 0 0 0"
  }
};
