/**
 * Engagement System
 *
 * Detects discovery milestones and generates challenge prompts
 * based on the student's prediction history in the StudentModel.
 * All data derived from existing StudentModel -- no new storage needed.
 */

import { StudentModel, EvidenceEntry, ConceptId } from './studentModel'

// ─── Discovery Milestones ────────────────────────────────────────────

export interface Discovery {
  id: string
  title: string
  description: string
}

const DISCOVERY_DEFINITIONS: {
  id: string
  title: string
  description: string
  check: (evidence: EvidenceEntry[]) => boolean
}[] = [
  {
    id: 'ohms_law',
    title: "Ohm's Law",
    description: "You've noticed that higher resistance means lower current. That's the core relationship in DC circuits.",
    check: (evidence) => countStreak(evidence, 'resistance', true) >= 3,
  },
  {
    id: 'voltage_intuition',
    title: 'Voltage Intuition',
    description: "You understand that more voltage pushes more current. That's the driving force in any circuit.",
    check: (evidence) => countStreak(evidence, 'voltage', true) >= 3,
  },
  {
    id: 'switch_master',
    title: 'Switch Master',
    description: "You've correctly predicted switch behavior in different circuit types. You understand how open/closed paths control current.",
    check: (evidence) => {
      const switchCorrect = evidence.filter(e => e.concept === 'state' && e.correct)
      const hasSeries = switchCorrect.some(e => e.circuitContext.topology === 'series')
      const hasParallel = switchCorrect.some(e => e.circuitContext.hasParallelGroups)
      return hasSeries && hasParallel
    },
  },
  {
    id: 'circuit_thinker',
    title: 'Circuit Thinker',
    description: "You've run 10 experiments and are building a strong foundation. Keep exploring!",
    check: (evidence) => evidence.length >= 10,
  },
  {
    id: 'inverse_relationship',
    title: 'Inverse Relationship',
    description: "You've seen that doubling resistance halves the current. Resistance and current are inversely related when voltage stays the same.",
    check: (evidence) => {
      const resistanceEntries = evidence.filter(e => e.concept === 'resistance' && e.correct)
      return resistanceEntries.length >= 4
    },
  },
]

/** Count the longest streak of consecutive correct predictions for a concept */
function countStreak(evidence: EvidenceEntry[], concept: ConceptId, correct: boolean): number {
  let maxStreak = 0
  let current = 0
  for (const entry of evidence) {
    if (entry.concept === concept) {
      if (entry.correct === correct) {
        current++
        maxStreak = Math.max(maxStreak, current)
      } else {
        current = 0
      }
    }
  }
  return maxStreak
}

/** Get all earned discoveries based on current evidence */
export function getDiscoveries(model: StudentModel): Discovery[] {
  const earned: Discovery[] = []
  for (const def of DISCOVERY_DEFINITIONS) {
    if (def.check(model.evidence)) {
      earned.push({ id: def.id, title: def.title, description: def.description })
    }
  }
  return earned
}

/** Get the most recently earned discovery (for display) */
export function getLatestDiscovery(model: StudentModel): Discovery | null {
  const all = getDiscoveries(model)
  return all.length > 0 ? all[all.length - 1] : null
}

// ─── Challenge Prompts ───────────────────────────────────────────────

const CHALLENGE_POOL: string[] = [
  "Can you make the current exactly 0.05A?",
  "Double the voltage -- does the current double too?",
  "What happens if you open the switch? What voltage does the battery show?",
  "Try to get the current below 0.01A.",
  "Set the voltage to 12V and resistance to 600 ohms. What do you expect?",
  "What if you halve the resistance? Predict first, then try.",
  "Can you find a voltage and resistance combination that gives exactly 0.02A?",
  "Increase the voltage step by step. Does current increase in a straight line?",
]

/** Get a challenge prompt based on how many predictions have been made */
export function getChallengePrompt(model: StudentModel): string | null {
  const totalPredictions = model.evidence.length
  if (totalPredictions < 2) return null

  // Rotate through challenges based on prediction count
  const index = totalPredictions % CHALLENGE_POOL.length
  return CHALLENGE_POOL[index]
}
