# TaleemLab

**Draw it on paper. Watch it come alive.**

TaleemLab is an AI-powered virtual physics lab that transforms a student's hand-drawn
DC circuit diagram into a live, interactive simulation. Using Alibaba Cloud's Qwen-VL,
the app reads a simple notebook photo, understands the components and connections,
and builds a working experiment students can modify with sliders, switches, or text
commands — complete with a predict-first learning loop and instant feedback.

Built for schools without functional physics labs, requiring nothing more than a
smartphone and paper.

Built for the **Alibaba Cloud AI Hackathon Pakistan 2026** — theme: *AI for Pakistan's Future*.

## How It Works
1. **Capture** — photograph a hand-drawn circuit
2. **Recognize** — Qwen-VL extracts components, values, and connections
3. **Confirm** — review and correct anything the AI got wrong
4. **Predict** — guess the outcome before a change applies
5. **Simulate** — see the real result, with reasoning-based feedback

## Tech Stack
- Frontend: Next.js
- Backend: Node/FastAPI
- Vision AI: Alibaba Cloud Qwen-VL
- Physics engine: custom deterministic DC circuit solver
