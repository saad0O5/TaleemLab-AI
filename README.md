# TaleemLab — AI Virtual Physics Lab

**Draw a circuit on paper. Take a photo. Watch it come alive.**

TaleemLab transforms hand-drawn DC circuit diagrams into interactive simulations using AI vision. Built for students in schools without physics labs — all you need is a smartphone and paper.

---

## The Problem

Over 80% of public schools in developing regions lack functional physics labs. Students memorize Ohm's Law from textbooks but never build intuition through experimentation. Without hands-on labs, misconceptions about voltage, current, and resistance go undiagnosed and uncorrected.

## The Solution

TaleemLab bridges this gap with an AI-powered virtual lab that:

1. **Reads hand-drawn circuits** — photograph a notebook sketch, and Gemini Vision extracts every component, value, and connection
2. **Simulates in real time** — a deterministic physics engine solves the circuit instantly
3. **Teaches through prediction** — before every change, students predict the outcome, building conceptual understanding
4. **Adapts to the learner** — a Student Reasoning Model (SRM) tracks misconceptions with Bayesian confidence scoring and delivers targeted explanations
5. **Evaluates progress** — AI-generated assessments identify strengths, weaknesses, and next steps

## Key Features

| Feature | Description |
|---------|-------------|
| Vision Recognition | Gemini Vision extracts circuit topology, components (including capacitors & diodes), and values from photos |
| Predict-First Learning | Students guess outcomes before seeing results — proven to improve retention |
| AI Tutor (Socratic) | Guides with questions, not just answers — adapts to misconception history and confidence level |
| Ask the AI Anything | Type any question about your circuit — AI answers using actual live values |
| Student Reasoning Model | Bayesian tracking of 6 known physics misconceptions with evidence-based confidence decay |
| Client-Side Solver | TypeScript physics engine runs locally — instant feedback, supports series, parallel, RC, and diode circuits |
| RC Time Visualization | Interactive charge/discharge slider when a capacitor is present — teaches τ = RC |
| Interactive Diagram | Hover any component to see live voltage, current, and brightness values |
| Discovery Milestones | Gamified achievements for building conceptual understanding |
| Sound & Toast Feedback | Audio cues and non-blocking notifications for predictions, toggles, and discoveries |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                  │
│                                                          │
│  Welcome → Setup → Lab Bench → Progress → Evaluation     │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Client-side  │  │  Student     │  │  Experiment    │  │
│  │ Circuit      │  │  Reasoning   │  │  Context       │  │
│  │ Solver (TS)  │  │  Model       │  │  (state mgmt)  │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │ REST API (Bearer token auth)
┌──────────────────────────▼───────────────────────────────┐
│               Backend (Vercel Serverless)                  │
│                                                          │
│  /api/recognize-circuit  →  Gemini Vision (image → JSON) │
│  /api/solve              →  Circuit solver (server-side) │
│  /api/apply-change       →  Change + re-solve            │
│  /api/text-command       →  NL command parser            │
│  /api/explain-prediction →  AI Tutor (Socratic + Gemini) │
│  /api/ask-ai             →  Ask any question (contextual) │
│  /api/learning-summary   →  Session summary (AI)         │
│  /api/evaluate-student   →  AI evaluation of progress    │
│  /api/health             →  Health check                  │
│                                                          │
│  All AI routes have rule-based fallbacks when Gemini      │
│  is unavailable (rate-limited, timeout, quota).           │
└──────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS 4, React Context API
- **Backend**: Node.js on Vercel serverless functions, modular route architecture
- **AI**: Google Gemini 2.0 Flash (vision + text), with fallback to Gemini 1.5 Flash
- **Physics**: Custom deterministic DC circuit solver (series + series-parallel, capacitors with RC time constants, diodes with forward voltage drop)
- **Pedagogy**: Student Reasoning Model with Bayesian misconception tracking, evidence memory, and adaptive investigation selection

## Running Locally

### Backend
```bash
cd backend
cp .env.example .env   # add GEMINI_API_KEY
npm install
node server.js          # starts on port 4000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npx next dev --turbopack
```

## What Makes It Different

Most educational AI tools wrap ChatGPT and call it a day. TaleemLab has genuine depth:

- **The Student Reasoning Model isn't a score tracker** — it's a Bayesian model that hypothesizes *why* a student is struggling and recommends *what* to investigate next
- **The AI Tutor uses the Socratic method** — it guides with questions, not just answers, and references the student's misconception history
- **Ask the AI Anything** — students can type any question about their circuit and get an answer that references actual live values (voltage, current, component states)
- **Everything degrades gracefully** — when AI is unavailable, the app falls back to deterministic explanations and never fully breaks
- **The solver runs client-side** — instant feedback with zero network latency for the core interaction loop
- **Physics goes deeper** — capacitors charge/discharge with real exponential curves, diodes drop 0.7V, and the RC time panel teaches time constants interactively

## Built For

**Alibaba Cloud AI Hackathon Pakistan 2026** — *AI for Pakistan's Future*

Target audience: Grade 9–10 physics students in schools without functional labs.
