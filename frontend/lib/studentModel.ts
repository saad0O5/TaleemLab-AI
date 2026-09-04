/**
 * Student Reasoning Model (SRM)
 *
 * Tracks the learner's evolving conceptual understanding through:
 * - Misconception hypotheses with confidence levels (0–1)
 * - Evidence memory linking each prediction to the reasoning behind it
 * - Adaptive investigation selection driven by misconception confidence
 *
 * Unlike a simple score tracker, the SRM diagnoses *why* a student
 * is struggling and recommends what to investigate next.
 */

import { PredictionKey, CircuitData } from './types'
import { supabase, getStudentId } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────

export type ConceptId = 'resistance' | 'voltage' | 'state'

export interface ConceptTracking {
  predictions: number
  correct: number
  lastPrediction: number | null
}

/** A known misconception with detection signature */
export interface MisconceptionDef {
  id: string
  label: string
  description: string
  concept: ConceptId
}

/** The AI's current hypothesis about a specific misconception */
export interface MisconceptionHypothesis {
  id: string
  confidence: number
  timesTriggered: number
  lastEvidence: number | null
}

/** One piece of evidence — a prediction linked to its reasoning context */
export interface EvidenceEntry {
  id: string
  timestamp: number
  concept: ConceptId
  predictionKey: PredictionKey
  direction: 'up' | 'down'
  answer: 'up' | 'down' | 'same'
  correct: boolean
  circuitContext: CircuitContext
  triggeredMisconceptions: string[]
  confidenceDelta: number
}

/** Snapshot of the circuit when the prediction was made */
export interface CircuitContext {
  topology: 'series' | 'series_parallel'
  hasParallelGroups: boolean
  hasSwitch: boolean
  componentCount: number
}

/** What the SRM recommends investigating next */
export interface InvestigationPriority {
  concept: ConceptId
  score: number
  reason: string
  suggestion: string
  relatedMisconceptions: string[]
}

/** The full Student Reasoning Model */
export interface StudentModel {
  concepts: Record<ConceptId, ConceptTracking>
  misconceptions: Record<string, MisconceptionHypothesis>
  evidence: EvidenceEntry[]
  investigations: InvestigationPriority[]
  lastUpdated: number | null
}

// ─── Known Misconceptions ────────────────────────────────────────────

export const MISCONCEPTIONS: MisconceptionDef[] = [
  {
    id: 'parallel_resistance_increase',
    label: 'Parallel resistance misconception',
    description: 'Believes adding resistors in parallel increases total resistance — actually decreases it because more paths are available for current.',
    concept: 'resistance',
  },
  {
    id: 'voltage_same_everywhere',
    label: 'Voltage is same everywhere',
    description: 'Believes voltage is identical across all components — in series circuits, voltage actually divides proportionally across components.',
    concept: 'voltage',
  },
  {
    id: 'switch_local_effect',
    label: 'Switch has local effect only',
    description: 'Believes a switch only controls the component nearest to it — in series, a switch controls ALL current flow; in parallel, a branch switch only affects that branch.',
    concept: 'state',
  },
  {
    id: 'resistance_current_inverse',
    label: 'Resistance–current relationship',
    description: 'Confuses the inverse relationship between resistance and current — higher resistance means LESS current (Ohm\'s Law: I = V/R).',
    concept: 'resistance',
  },
  {
    id: 'voltage_current_confusion',
    label: 'Voltage–current confusion',
    description: 'Confuses voltage (the push) with current (the flow) — increasing voltage increases current, but they are fundamentally different quantities.',
    concept: 'voltage',
  },
  {
    id: 'open_circuit_current',
    label: 'Open circuit current flow',
    description: 'Believes current can still flow in an open circuit — current requires a complete closed path; opening a switch stops all current.',
    concept: 'state',
  },
]

// ─── Constants ───────────────────────────────────────────────────────

const STORAGE_KEY = 'taleemlab_srm'
const INITIAL_CONFIDENCE = 0.15
const CONFIDENCE_BOOST = 0.12
const CONFIDENCE_DECAY = 0.06
const MAX_CONFIDENCE = 0.95
const MIN_CONFIDENCE = 0.0
const MAX_EVIDENCE_ENTRIES = 200  // prevent localStorage overflow

// ─── Helpers ─────────────────────────────────────────────────────────

function emptyModel(): StudentModel {
  return {
    concepts: {
      resistance: { predictions: 0, correct: 0, lastPrediction: null },
      voltage: { predictions: 0, correct: 0, lastPrediction: null },
      state: { predictions: 0, correct: 0, lastPrediction: null },
    },
    misconceptions: {},
    evidence: [],
    investigations: [],
    lastUpdated: null,
  }
}

export function loadStudentModel(): StudentModel {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyModel()
    const parsed = JSON.parse(raw)
    // Validate schema conformance
    if (!parsed || typeof parsed !== 'object') return emptyModel()
    if (!parsed.concepts || typeof parsed.concepts !== 'object') return emptyModel()
    for (const key of ['resistance', 'voltage', 'state'] as ConceptId[]) {
      if (!parsed.concepts[key] || typeof parsed.concepts[key].predictions !== 'number') {
        return emptyModel()
      }
    }
    if (!Array.isArray(parsed.evidence)) return emptyModel()
    if (!parsed.misconceptions || typeof parsed.misconceptions !== 'object') parsed.misconceptions = {}
    if (!Array.isArray(parsed.investigations)) parsed.investigations = []
    return { ...emptyModel(), ...parsed }
  } catch {
    return emptyModel()
  }
}

export function saveStudentModel(model: StudentModel): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(model))
  // Sync to Supabase in background (non-blocking)
  syncToSupabase(model).catch(() => {})
}

export function resetStudentModel(): StudentModel {
  localStorage.removeItem(STORAGE_KEY)
  return emptyModel()
}

// ─── Supabase Sync ───────────────────────────────────────────────────

async function syncToSupabase(model: StudentModel): Promise<void> {
  try {
    const studentId = await getStudentId()
    
    // Update student record
    await supabase.from('students').upsert({
      id: studentId,
      last_active_at: new Date().toISOString(),
      total_predictions: model.concepts.resistance.predictions + model.concepts.voltage.predictions + model.concepts.state.predictions,
      total_correct: model.concepts.resistance.correct + model.concepts.voltage.correct + model.concepts.state.correct,
    })
    
    // Sync misconceptions
    for (const [misId, hypothesis] of Object.entries(model.misconceptions)) {
      if (hypothesis) {
        await supabase.from('misconceptions').upsert({
          student_id: studentId,
          misconception_id: misId,
          confidence: hypothesis.confidence,
          times_triggered: hypothesis.timesTriggered,
          last_evidence_at: hypothesis.lastEvidence ? new Date(hypothesis.lastEvidence).toISOString() : null,
        })
      }
    }
    
    // Sync evidence (only new entries since last sync)
    const lastSynced = localStorage.getItem('taleemlab_last_synced_evidence')
    const lastSyncedCount = lastSynced ? parseInt(lastSynced) : 0
    
    if (model.evidence.length > lastSyncedCount) {
      const newEvidence = model.evidence.slice(lastSyncedCount)
      const evidenceRows = newEvidence.map(e => ({
        student_id: studentId,
        concept: e.concept,
        prediction_key: e.predictionKey,
        direction: e.direction,
        answer: e.answer,
        correct: e.correct,
        circuit_topology: e.circuitContext.topology,
        circuit_has_parallel: e.circuitContext.hasParallelGroups,
        circuit_has_switch: e.circuitContext.hasSwitch,
        circuit_component_count: e.circuitContext.componentCount,
        triggered_misconceptions: e.triggeredMisconceptions,
        confidence_delta: e.confidenceDelta,
      }))
      
      await supabase.from('evidence').insert(evidenceRows)
      localStorage.setItem('taleemlab_last_synced_evidence', model.evidence.length.toString())
    }
  } catch (err) {
    console.warn('Supabase sync failed:', err)
  }
}

export async function loadFromSupabase(): Promise<StudentModel | null> {
  try {
    const studentId = await getStudentId()
    
    // Load misconceptions
    const { data: misData } = await supabase
      .from('misconceptions')
      .select('*')
      .eq('student_id', studentId)
    
    // Load evidence
    const { data: evidenceData } = await supabase
      .from('evidence')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
    
    if (!evidenceData || evidenceData.length === 0) return null
    
    // Reconstruct model from Supabase data
    const model = emptyModel()
    
    // Reconstruct misconceptions
    if (misData) {
      for (const row of misData) {
        model.misconceptions[row.misconception_id] = {
          id: row.misconception_id,
          confidence: row.confidence,
          timesTriggered: row.times_triggered,
          lastEvidence: row.last_evidence_at ? new Date(row.last_evidence_at).getTime() : null,
        }
      }
    }
    
    // Reconstruct evidence and concept stats
    for (const row of evidenceData) {
      model.evidence.push({
        id: row.id,
        timestamp: new Date(row.created_at).getTime(),
        concept: row.concept as ConceptId,
        predictionKey: row.prediction_key,
        direction: row.direction as 'up' | 'down',
        answer: row.answer as 'up' | 'down' | 'same',
        correct: row.correct,
        circuitContext: {
          topology: row.circuit_topology as any,
          hasParallelGroups: row.circuit_has_parallel,
          hasSwitch: row.circuit_has_switch,
          componentCount: row.circuit_component_count,
        },
        triggeredMisconceptions: row.triggered_misconceptions || [],
        confidenceDelta: row.confidence_delta,
      })
      
      // Update concept stats
      const concept = model.concepts[row.concept as ConceptId]
      if (concept) {
        concept.predictions++
        if (row.correct) concept.correct++
        concept.lastPrediction = new Date(row.created_at).getTime()
      }
    }
    
    // Recalculate investigations
    model.investigations = computeInvestigationPriority(model)
    model.lastUpdated = Date.now()
    
    return model
  } catch (err) {
    console.warn('Supabase load failed:', err)
    return null
  }
}

// ─── Circuit Context Detection ───────────────────────────────────────

export function detectCircuitContext(circuit: CircuitData): CircuitContext {
  const hasSwitch = circuit.components.some(c => c.type === 'switch')
  const hasParallelGroups =
    circuit.topology === 'series_parallel' ||
    (circuit.parallel_groups != null && circuit.parallel_groups.length > 0)
  return {
    topology: circuit.topology,
    hasParallelGroups,
    hasSwitch,
    componentCount: circuit.components.length,
  }
}

// ─── Misconception Detection ─────────────────────────────────────────
//
// Each wrong prediction is analysed against the circuit context to
// determine which known misconceptions *could* explain the error.
// Multiple misconceptions may fire for a single prediction — confidence
// accumulates over repeated evidence.

function detectMisconceptions(
  key: PredictionKey,
  direction: 'up' | 'down',
  answer: 'up' | 'down' | 'same',
  correct: boolean,
  ctx: CircuitContext,
): string[] {
  if (correct) return []
  const ids: string[] = []

  if (key === 'resistance') {
    // Student got the current direction wrong after changing resistance
    if (answer === 'same') {
      // Thinks resistance change has NO effect on current — deep confusion
      ids.push('resistance_current_inverse')
    } else {
      // Thinks current goes the WRONG way — classic inverse confusion
      ids.push('resistance_current_inverse')
    }
    if (ctx.hasParallelGroups && direction === 'up' && answer === 'up') {
      // Specifically thinks adding resistance in parallel increases total R
      ids.push('parallel_resistance_increase')
    }
  }

  if (key === 'voltage') {
    if (answer === 'same') {
      // Thinks voltage change has NO effect — fundamental confusion
      ids.push('voltage_current_confusion')
    } else if (ctx.topology === 'series' && answer !== (direction === 'up' ? 'up' : 'down')) {
      // In series, got the direction wrong — may think voltage is same everywhere
      ids.push('voltage_same_everywhere')
      ids.push('voltage_current_confusion')
    } else {
      ids.push('voltage_current_confusion')
    }
  }

  if (key === 'state') {
    if (answer === 'same') {
      // Thinks switch state has NO effect on current
      ids.push('open_circuit_current')
      if (ctx.hasParallelGroups) {
        // In parallel, may think switch only affects nearby component
        ids.push('switch_local_effect')
      }
    } else if (ctx.hasParallelGroups) {
      // Got the direction wrong in a parallel circuit
      ids.push('switch_local_effect')
    } else {
      ids.push('open_circuit_current')
    }
  }

  return ids
}

// ─── Core: Update Student Model ──────────────────────────────────────

export function updateStudentModel(
  model: StudentModel,
  key: PredictionKey,
  direction: 'up' | 'down',
  answer: 'up' | 'down' | 'same',
  correct: boolean,
  circuitContext: CircuitContext,
): StudentModel {
  const now = Date.now()
  const updated: StudentModel = structuredClone(model)

  // 1. Update concept tracking
  const concept = updated.concepts[key]
  concept.predictions++
  if (correct) concept.correct++
  concept.lastPrediction = now

  // 2. Detect which misconceptions this evidence triggers
  const triggered = detectMisconceptions(key, direction, answer, correct, circuitContext)

  // 3. Update misconception confidence
  let totalDelta = 0

  if (correct) {
    // Correct prediction → reduce the HIGHEST-confidence misconception for this concept
    // (one correct answer addresses the primary confusion, not all of them)
    const conceptMis = MISCONCEPTIONS
      .filter(m => m.concept === key)
      .map(m => updated.misconceptions[m.id])
      .filter((h): h is MisconceptionHypothesis => h != null && h.confidence > 0)
    if (conceptMis.length > 0) {
      const top = conceptMis.reduce((a, b) => a.confidence >= b.confidence ? a : b)
      top.confidence = Math.max(MIN_CONFIDENCE, top.confidence - CONFIDENCE_DECAY)
      top.timesTriggered++
      top.lastEvidence = now
      totalDelta -= CONFIDENCE_DECAY
    }
  } else {
    // Wrong prediction → boost triggered misconceptions
    for (const id of triggered) {
      const existing = updated.misconceptions[id]
      if (existing) {
        const delta = CONFIDENCE_BOOST * (1 - existing.confidence) // diminishing returns
        existing.confidence = Math.min(MAX_CONFIDENCE, existing.confidence + delta)
        existing.timesTriggered++
        existing.lastEvidence = now
        totalDelta += delta
      } else {
        updated.misconceptions[id] = {
          id,
          confidence: INITIAL_CONFIDENCE,
          timesTriggered: 1,
          lastEvidence: now,
        }
        totalDelta += INITIAL_CONFIDENCE
      }
    }
  }

  // 4. Append evidence entry (prune oldest if over cap)
  const evidenceId = `${now}-${key}-${Math.random().toString(36).slice(2, 7)}`
  updated.evidence.push({
    id: evidenceId,
    timestamp: now,
    concept: key,
    predictionKey: key,
    direction,
    answer,
    correct,
    circuitContext,
    triggeredMisconceptions: triggered,
    confidenceDelta: correct ? -CONFIDENCE_DECAY : totalDelta,
  })
  // Keep only the most recent entries to prevent localStorage overflow
  if (updated.evidence.length > MAX_EVIDENCE_ENTRIES) {
    updated.evidence = updated.evidence.slice(-MAX_EVIDENCE_ENTRIES)
  }

  // 5. Recompute investigation priorities
  updated.investigations = computeInvestigationPriority(updated)
  updated.lastUpdated = now

  return updated
}

// ─── Investigation Selection ─────────────────────────────────────────
//
// Priority = misconception_confidence × 0.4 + (1 − accuracy) × 0.4 + novelty × 0.2
// This balances targeting misconceptions vs weak areas vs unexplored concepts.

function computeInvestigationPriority(model: StudentModel): InvestigationPriority[] {
  const priorities: InvestigationPriority[] = []

  for (const conceptId of ['resistance', 'voltage', 'state'] as ConceptId[]) {
    const tracking = model.concepts[conceptId]
    const accuracy = tracking.predictions > 0 ? tracking.correct / tracking.predictions : 0
    const novelty = tracking.predictions === 0 ? 1 : 0

    // Find the highest-confidence misconception for this concept
    const conceptMisconceptions = MISCONCEPTIONS
      .filter(m => m.concept === conceptId)
      .map(m => model.misconceptions[m.id])
      .filter((h): h is MisconceptionHypothesis => h != null && h.confidence > 0)

    const maxConfidence = conceptMisconceptions.length > 0
      ? Math.max(...conceptMisconceptions.map(h => h.confidence))
      : 0

    const activeMisconceptionIds = conceptMisconceptions
      .filter(h => h.confidence >= 0.2)
      .map(h => h.id)

    const score = maxConfidence * 0.4 + (1 - accuracy) * 0.4 + novelty * 0.2

    let reason: string
    let suggestion: string
    if (novelty > 0) {
      reason = 'Not yet explored — start here to build understanding.'
      suggestion = conceptId === 'resistance'
        ? 'Try increasing the resistance and predict what happens to current.'
        : conceptId === 'voltage'
        ? 'Try increasing the battery voltage and predict what happens to current.'
        : 'Try opening and closing the switch to see how it affects the circuit.'
    } else if (maxConfidence >= 0.3) {
      const topMis = conceptMisconceptions.find(h => h.confidence === maxConfidence)
      const def = topMis ? MISCONCEPTIONS.find(m => m.id === topMis.id) : null
      reason = def
        ? `Possible misconception: "${def.label}".`
        : 'Confusion detected — this concept needs reinforcement.'
      suggestion = def
        ? `Review: ${def.description}`
        : 'Try predicting the effect before making changes.'
    } else if (accuracy < 0.5) {
      reason = `Low accuracy (${tracking.correct}/${tracking.predictions}) — needs more practice.`
      suggestion = 'Take your time to think about Ohm\'s Law before predicting.'
    } else {
      reason = 'Understanding looks solid — try a challenge.'
      suggestion = conceptId === 'resistance'
        ? 'Try a series-parallel circuit to test your understanding.'
        : conceptId === 'voltage'
        ? 'Try circuits with multiple batteries to explore voltage addition.'
        : 'Explore how switches behave in parallel circuits.'
    }

    priorities.push({
      concept: conceptId,
      score: Math.round(score * 100) / 100,
      reason,
      suggestion,
      relatedMisconceptions: activeMisconceptionIds,
    })
  }

  return priorities.sort((a, b) => b.score - a.score)
}

/** Pick the single best next investigation */
export function pickNextInvestigation(model: StudentModel): InvestigationPriority | null {
  if (model.investigations.length === 0) return null
  return model.investigations[0]
}

// ─── Summary & Evidence ──────────────────────────────────────────────

export interface SRMSummary {
  totalPredictions: number
  totalCorrect: number
  accuracy: number
  primaryMisconception: {
    id: string
    label: string
    description: string
    confidence: number
  } | null
  nextInvestigation: InvestigationPriority | null
  evidenceCount: number
}

export function getSRMSummary(model: StudentModel): SRMSummary {
  const totalPredictions = Object.values(model.concepts).reduce((s, c) => s + c.predictions, 0)
  const totalCorrect = Object.values(model.concepts).reduce((s, c) => s + c.correct, 0)

  // Find the highest-confidence active misconception
  let primaryMisconception: SRMSummary['primaryMisconception'] = null
  for (const mis of MISCONCEPTIONS) {
    const h = model.misconceptions[mis.id]
    if (h && h.confidence >= 0.2) {
      if (!primaryMisconception || h.confidence > primaryMisconception.confidence) {
        primaryMisconception = {
          id: mis.id,
          label: mis.label,
          description: mis.description,
          confidence: h.confidence,
        }
      }
    }
  }

  return {
    totalPredictions,
    totalCorrect,
    accuracy: totalPredictions > 0 ? totalCorrect / totalPredictions : 0,
    primaryMisconception,
    nextInvestigation: pickNextInvestigation(model),
    evidenceCount: model.evidence.length,
  }
}

/** Format the last N evidence entries into human-readable summaries */
export function getEvidenceSummary(model: StudentModel, limit = 5): string[] {
  const recent = model.evidence.slice(-limit)
  return recent.map(e => {
    const dir = e.direction === 'up' ? 'increased' : 'decreased'
    const conceptLabel = e.concept === 'state' ? 'switch' : e.concept
    const result = e.correct ? '✓' : '✗'
    return `${result} Predicted current would go ${e.answer} when ${conceptLabel} ${dir} — ${e.correct ? 'correct' : 'incorrect'}`
  })
}

const CONCEPT_LABELS: Record<ConceptId, string> = {
  resistance: 'Resistance',
  voltage: 'Voltage',
  state: 'Switch / Circuit State',
}

export function getConceptLabel(id: ConceptId): string {
  return CONCEPT_LABELS[id] || id
}

// ─── Prediction Tracking (merged from progressTracker.ts) ────────────

export interface PredictionEntry {
  concept: 'resistance' | 'voltage' | 'state'
  correct: boolean
  timestamp: number
}

const PREDICTIONS_KEY = 'taleemlab_predictions'

export function recordPrediction(entry: PredictionEntry): void {
  const entries = getPredictions()
  entries.push(entry)
  localStorage.setItem(PREDICTIONS_KEY, JSON.stringify(entries))
}

export function getPredictions(): PredictionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(PREDICTIONS_KEY) || '[]')
  } catch {
    return []
  }
}

export function resetProgress(): void {
  localStorage.removeItem(PREDICTIONS_KEY)
}

export function getConceptBreakdown(entries: PredictionEntry[]) {
  const concepts: Record<string, { total: number; correct: number }> = {}
  for (const e of entries) {
    if (!concepts[e.concept]) concepts[e.concept] = { total: 0, correct: 0 }
    concepts[e.concept].total++
    if (e.correct) concepts[e.concept].correct++
  }
  return concepts
}
