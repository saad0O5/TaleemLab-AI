# TaleemLab — AI Virtual Physics Lab

> **Draw a circuit on paper. Take a photo. Watch it come alive — and learn by predicting what happens next.**

An AI-powered virtual physics lab for students who have no working lab, no expensive equipment — just a notebook, a pencil, and a phone. Photograph a hand-drawn DC circuit, and TaleemLab reads it, simulates it in real time, and tutors the student through it.

**Built for the Alibaba Cloud AI Hackathon Pakistan 2026 (Bano Qabil × Alkhidmat) — *AI for Pakistan's Future*.** Track: **Education**.

---

## Why it matters (Problem & Impact)

A large share of public schools in Pakistan have no functional physics lab. Students memorise Ohm's Law from a textbook but never *feel* why turning a knob changes the bulb. The misconceptions — "current gets used up by the first resistor", "a bigger battery pushes more current no matter what" — go **undiagnosed and uncorrected**, because a human teacher with 50 students cannot spot each wrong mental model.

TaleemLab turns any notebook sketch into an interactive lab and, crucially, **diagnoses and corrects the reasoning**, not just the answer. This is directly usable in a Grade 9–10 classroom with a single shared phone.

## What it does (the flow)

```
Draw on paper → Photograph → AI reads components & values → Simulate live
     → Predict first → Change one variable → AI tutor explains *why* → Adapt
```

1. **Reads hand-drawn circuits** — a vision model extracts every component, value, connection, *and* the likely topic the student is exploring.
2. **Simulates instantly** — a deterministic physics engine (not a guess) solves the circuit the moment you touch it.
3. **Teaches predict-first** — before any change, the student commits to a prediction. This is the core pedagogy, not decoration.
4. **Adapts to the learner** — a Student Reasoning Model tracks misconceptions with Bayesian confidence and picks the next thing to investigate.
5. **Evaluates understanding** — an AI-generated assessment of strengths, weak concepts, and next steps.

## What makes it a real system, not a ChatGPT wrapper (Innovation & Technical Depth)

| | |
|---|---|
| **Student Reasoning Model (SRM)** | A confidence-updating model over six known physics misconceptions. Each misconception has a hand-authored detection signature; wrong predictions *raise* its confidence and correct ones *decay* it (Bayesian update with diminishing returns). It keeps an evidence memory and computes an **investigation priority** (`score = 0.4·maxConfidence + 0.4·(1−accuracy) + 0.2·novelty`) to decide what to probe next. |
| **Deterministic solver, run client-side** | Series, series-parallel (per-group voltage division), capacitors (τ = RC), diodes (0.7 V drop), bulbs (brightness), ammeters/voltmeters. Sanity limits, short-circuit handling, current capping, and graceful degradation on impossible inputs. Zero network latency — feedback is instant. |
| **Socratic AI tutor** | Guides with questions, referencing the student's own misconception history and the **live** circuit values. |
| **Ask-the-AI-anything** | Free-text questions answered against actual current values, not generic textbook text. |
| **Local-first architecture** | Only 5 endpoints touch the network (recognition + 4 AI calls). Solve, apply-change and text-command run entirely in the browser. |
| **Nothing hard-crashes** | Every AI route has a deterministic rule-based fallback. If the network is down, the lab still works. |

## How it works

```
┌──────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 16 + TS)                │
│  Welcome → Confirm → Lab Bench → Progress → Evaluation    │
│  ┌────────────┐ ┌────────────┐ ┌───────────────────────┐  │
│  │ Client-side│ │  Student   │ │  Experiment state +   │  │
│  │ solver(TS) │ │  Reasoning │ │  engagement / SRM     │  │
│  │  (instant) │ │  Model     │ │  (React Context)      │  │
│  └────────────┘ └────────────┘ └───────────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │  REST (only recognition + AI)
┌──────────────────────────▼───────────────────────────────┐
│              Backend (Node.js — standalone)               │
│  POST /api/recognize-circuit   → vision: image → JSON     │
│  POST /api/explain-prediction  → Socratic tutor           │
│  POST /api/learning-summary    → session recap            │
│  POST /api/evaluate-student    → AI assessment            │
│  POST /api/ask-ai              → contextual Q&A           │
│  POST /api/solve-circuit · apply-change · text-command    │
│         (also exposed server-side; the client uses local) │
│  GET  /api/health                                         │
│  CORS allowlist · opt-in bearer auth · rate limit ·       │
│  10 MB payload cap · rule-based fallbacks on every AI call│
└───────────────────────────────────────────────────────────┘
```

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, React Context, hand-built SVG circuit renderer with animated current flow.
- **Backend:** Node.js HTTP server (standalone; also deployable to Vercel serverless via `vercel.json` + `api/index.js`), modular routes.
- **AI:** Google Gemini (vision + text), configured via `GEMINI_MODEL` (default `gemini-3.6-flash`, automatic fallbacks). Behind a single `callGemini()` seam.
- **Physics & pedagogy:** custom deterministic DC solver + Bayesian Student Reasoning Model.
- **Persistence:** `localStorage` by default; optional Supabase sync (off unless configured).

> **On the AI provider.** TaleemLab uses Google Gemini because, as student builders, we did not have budget for a paid cloud model subscription at build time. The provider is isolated behind one function (`backend/lib/gemini.js`), so it can be pointed at a Qwen / DashScope vision model with a small change and no architectural rework. For the live demo we use a fresh API key (the build-time key's free quota was exhausted). We built the project with **Qoder**, Alibaba's agentic AI coding IDE, funded by the hackathon credits — that is our Alibaba Cloud touchpoint.

## Run it locally

**1. Backend** (port 4000)
```bash
cd backend
cp .env.example .env       # put your GEMINI_API_KEY in .env
npm install
npm run dev                # or: node server.js
```

**2. Frontend** (port 3000)
```bash
cd frontend
cp .env.example .env.local # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
```

Open http://localhost:3000.

## Verify the engine

```bash
cd backend
npm test
```
Runs 19 no-network assertions over the solver, the NL command parser, and a
recognition type-parity guard (`test-pipeline.js`).

## Demoing it (works even with a flaky connection)

- **Best case:** photograph a hand-drawn series or series-parallel circuit → confirm values → predict → experiment → ask the tutor → open the AI evaluation.
- **Zero-network path:** on the welcome screen, pick a **sample experiment** (Simple series, Series-parallel, RC charging, Diode + LED). These load instantly and drive the full simulation, predictions, SRM adaptation, discovery milestones, and progress — no API required. Use this if the venue Wi-Fi or the model quota is unreliable on stage.

## Known limits (honest)

- The solver covers series and single-level series-parallel topologies, not arbitrary mesh networks.
- Recognition reads standard symbols; messy or non-standard drawings can mis-read values — the app surfaces its uncertainty and asks the student to confirm rather than silently trusting a wrong read.
- Supabase sync / teacher analytics ship as an optional layer and are off unless configured.

## License

MIT — see [LICENSE](./LICENSE).
