import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CircuitData, ComponentState, View, PredictionKey, Prediction,
  Explanation, SolverFlag, SANITY_LIMITS, CorrectionComparison
} from '../../lib/types'
import { STAT_COLORS } from '../../lib/colors'
import { ExampleKey, exampleLabels } from '../../lib/exampleCircuits'
import { getPredictions, getConceptBreakdown } from '../../lib/studentModel'
import {
  StudentModel, getSRMSummary, getEvidenceSummary, pickNextInvestigation,
  MISCONCEPTIONS
} from '../../lib/studentModel'
import { getLatestDiscovery, getChallengePrompt, getDiscoveries } from '../../lib/engagement'
import { TopBar } from '../ui/TopBar'
import { AITutorCard } from '../ui/AITutorCard'
import { DiscoveryCard } from '../ui/DiscoveryCard'
import { ChallengePrompt } from '../ui/ChallengePrompt'
import { AIAskCard } from '../ai/AIAskCard'
import { useToast } from '../ui/Toast'
import { Icon } from '../icons/Icon'
import { CircuitDiagram } from '../circuit/CircuitDiagram'
import { CapacitorPanel } from '../circuit/CapacitorPanel'
import { Stat } from '../circuit/Stat'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { CircuitContext } from '../../lib/api'

const PREDICTION_HINTS: Record<PredictionKey, string> = {
  resistance: "Remember Ohm's Law relates voltage, current, and resistance — what does increasing one side do to the other?",
  voltage: "Think about the relationship between the push (voltage) and the flow (current) — if the push gets stronger, what happens?",
  state: "Consider what a switch controls — does it affect the path for current, or the amount of push?",
}

interface LabScreenProps {
  selectedExample: ExampleKey | 'custom'
  circuit: CircuitData | null
  componentStates: ComponentState[]
  solverFlags: SolverFlag[]
  error: string
  voltage: number
  resistance: number
  closed: boolean
  current: number
  brightness: number
  capped: boolean
  prediction: Prediction | null
  question: string
  predictedNext: number | string
  command: string
  commandMessage: string
  explanation: Explanation | null
  aiThinking: boolean
  onSelectExample: (key: ExampleKey) => void
  onViewChange: (view: View) => void
  onChangeValue: (key: PredictionKey, next: number | string, direction: 'up' | 'down', answer: 'up' | 'down' | 'same') => void
  onRequestChange: (key: PredictionKey, next: any, direction: 'up' | 'down', componentId?: string) => void
  onToggleSwitch: () => void
  onCommandInputChange: (value: string) => void
  onApplyCommand: () => void
  correctionComparison: CorrectionComparison | null
  onDismissComparison: () => void
  studentModel: StudentModel
  onResetStudentModel: () => void
  onUndo?: () => void
  canUndo?: boolean
  onStepClick?: (step: number) => void
}

export function LabScreen(props: LabScreenProps) {
  const {
    selectedExample, circuit, componentStates, solverFlags, error,
    voltage, resistance, closed, current, brightness, capped,
    prediction, question, predictedNext,
    command, commandMessage, explanation, aiThinking,
    onSelectExample, onViewChange, onChangeValue, onRequestChange,
    onToggleSwitch, onCommandInputChange, onApplyCommand,
    correctionComparison, onDismissComparison,
    studentModel, onResetStudentModel, onUndo, canUndo, onStepClick,
  } = props

  const [showHint, setShowHint] = useState(false)
  const [showCommand, setShowCommand] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState<string | undefined>(undefined)
  const sfx = useSoundEffects()
  const { addToast } = useToast()
  const prevExplanationRef = useRef<Explanation | null>(null)
  const prevDiscoveryCountRef = useRef(0)

  // Sound + toast: correct/wrong when explanation arrives
  useEffect(() => {
    if (explanation && explanation !== prevExplanationRef.current) {
      if (explanation.correct) {
        sfx.correct()
        addToast('success', explanation.text ? explanation.text.slice(0, 60) : 'Correct prediction!')
      } else {
        sfx.wrong()
        addToast('error', explanation.text ? explanation.text.slice(0, 60) : 'Not quite — try again')
      }
      prevExplanationRef.current = explanation
    }
  }, [explanation, sfx, addToast])

  // Sound + toast: discovery milestone earned
  const discoveries = getDiscoveries(studentModel)
  useEffect(() => {
    if (discoveries.length > prevDiscoveryCountRef.current && prevDiscoveryCountRef.current > 0) {
      sfx.discovery()
      const latest = discoveries[discoveries.length - 1]
      addToast('discovery', `Discovery: ${latest?.title || 'New milestone!'}`)
    }
    prevDiscoveryCountRef.current = discoveries.length
  }, [discoveries.length, sfx, addToast])

  // Keyboard shortcuts: 1=increases, 2=decreases, 3=same (for predictions)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (prediction) {
      if (e.key === '1') onChangeValue(prediction.key, predictedNext, prediction.direction, 'up')
      else if (e.key === '2') onChangeValue(prediction.key, predictedNext, prediction.direction, 'down')
      else if (e.key === '3') onChangeValue(prediction.key, predictedNext, prediction.direction, 'same')
    }
  }, [prediction, predictedNext, onChangeValue])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const entries = getPredictions()
  const breakdown = getConceptBreakdown(entries)
  const totalCorrect = entries.filter(e => e.correct).length
  const srmSummary = getSRMSummary(studentModel)
  const nextInvestigation = pickNextInvestigation(studentModel)
  const latestDiscovery = getLatestDiscovery(studentModel)
  const challengePrompt = getChallengePrompt(studentModel)

  const conceptLabels: Record<string, string> = { resistance: 'Resistance', voltage: 'Voltage', state: 'Switch' }

  function masteryLevel(correct: number, total: number): { label: string; className: string; percent: number } {
    if (total === 0) return { label: 'Not started', className: 'level-beginner', percent: 0 }
    const ratio = correct / total
    const percent = Math.round(ratio * 100)
    if (ratio <= 0.25) return { label: 'Just starting', className: 'level-beginner', percent }
    if (ratio <= 0.50) return { label: 'Building understanding', className: 'level-developing', percent }
    if (ratio <= 0.75) return { label: 'Good grasp', className: 'level-proficient', percent }
    return { label: 'Strong understanding', className: 'level-advanced', percent }
  }

  // Check if circuit has a capacitor
  const capacitorState = componentStates.find(cs => cs.type === 'capacitor') as (ComponentState & { tau?: number }) | undefined
  const capacitorComponent = circuit?.components.find(c => c.type === 'capacitor')

  return (
    <main className="page-shell">
      <TopBar step={3} onStepClick={onStepClick} currentView="simulate" />

      <div className="sim-header">
        <div>
          <p className="eyebrow">Experiment</p>
          <h1>Your lab <span>bench</span></h1>
          <p>Change one thing at a time. Predict what happens first, then see your AI tutor&apos;s response.</p>
        </div>
        <div className="hdr-actions">
          {selectedExample !== 'custom' ? (
            <select
              value={selectedExample}
              onChange={(e) => onSelectExample(e.target.value as ExampleKey)}
              aria-label="Choose a sample circuit"
              className="select-inline"
            >
              {Object.entries(exampleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          ) : (
            <button className="btn-text" onClick={() => onViewChange('capture')}>
              <Icon type="camera" size={14} /> New experiment
            </button>
          )}
          <div className="synced"><Icon type="check" size={14} /> Ready</div>
        </div>
      </div>

      {error && (
        <div className="alert-wrap">
          <div className="alert alert-danger"><Icon type="alert" size={18} /><div><strong>Error:</strong> {error}</div></div>
        </div>
      )}

      <div className="sim-layout">
        {/* ─── LEFT: Lab Bench + AI Tutor ─── */}
        <section className="lab-col">
          <div className="lab-bench">
            <div className="lab-bench-label">
              <span>Your experiment</span>
              <span className="count-muted">{circuit?.components.length || 0} components</span>
            </div>
            <CircuitDiagram circuit={circuit} componentStates={componentStates} closed={closed} current={current} />
            <div className="stats-grid">
              <Stat label="Voltage" value={voltage.toString()} unit="V" color={STAT_COLORS.voltage} />
              <Stat label="Resistance" value={resistance.toString()} unit={'\u03A9'} color={STAT_COLORS.resistance} />
              <Stat label="Current" value={capped ? 'Very high' : current.toFixed(3)} unit={capped ? 'real components differ' : 'A'} warning={capped} color={STAT_COLORS.current} />
              <Stat label="Brightness" value={brightness.toString()} unit="%" color={STAT_COLORS.brightness} />
            </div>
          </div>

          {/* AI Tutor Card — the hero */}
          <AITutorCard
            explanation={explanation}
            aiThinking={aiThinking}
            onFollowUpClick={(q) => setFollowUpQuestion(q)}
          />

          {/* AI Ask Anything */}
          <AIAskCard
            circuitContext={{
              voltage,
              current,
              closed,
              topology: circuit?.topology,
              components: circuit?.components.map(c => ({
                id: c.id,
                type: c.type,
                voltage: c.voltage,
                resistance: c.resistance,
                state: c.state,
              })),
            }}
            initialQuestion={followUpQuestion}
          />

          {/* Capacitor RC panel — only shown when capacitor is in circuit */}
          {capacitorState && capacitorComponent && resistance > 0 && (
            <CapacitorPanel
              tau={(capacitorState as any).tau || (resistance * (capacitorComponent.capacitance || 100) * 1e-6)}
              sourceVoltage={voltage}
              totalResistance={resistance}
              closed={closed}
            />
          )}
        </section>

        {/* ─── CENTER: Controls ─── */}
        <section className="controls-col">
          <div className="section-label">Experiment controls</div>

          {/* Prediction overlay */}
          {prediction && (
            <div className="prediction-card">
              <div className="prediction-label">Predict first</div>
              <h2>{question}</h2>
              <div className="answer-grid">
                <button className="answer-btn" onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'up')}>
                  <span className="answer-icon"><Icon type="arrow-up" size={14} /></span>
                  Increases <span className="kbd">1</span>
                </button>
                <button className="answer-btn" onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'down')}>
                  <span className="answer-icon"><Icon type="arrow-down" size={14} /></span>
                  Decreases <span className="kbd">2</span>
                </button>
                <button className="answer-btn" onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'same')}>
                  <span className="answer-icon"><Icon type="equals" size={14} /></span>
                  Stays the same <span className="kbd">3</span>
                </button>
              </div>
              {!showHint && <button className="hint-toggle" onClick={() => setShowHint(true)}>Need a hint?</button>}
              {showHint && <p className="hint-text">{PREDICTION_HINTS[prediction.key]}</p>}
            </div>
          )}

          {/* Voltage slider */}
          <div className={`control-card${prediction ? ' is-disabled' : ''}`}>
            <label htmlFor="voltage">Battery voltage <output>{voltage} V</output></label>
            <input
              id="voltage"
              type="range"
              min={SANITY_LIMITS.voltage.min}
              max={SANITY_LIMITS.voltage.max}
              value={voltage}
              onChange={(e) => { const n = Number(e.target.value); onRequestChange('voltage', n, n > voltage ? 'up' : 'down') }}
              disabled={!!prediction}
            />
            <div className="range-labels">
              <span>{SANITY_LIMITS.voltage.min}V</span>
              <span>{SANITY_LIMITS.voltage.max}V</span>
            </div>
          </div>

          {/* Resistance slider */}
          <div className={`control-card${prediction ? ' is-disabled' : ''}`}>
            <label htmlFor="resistance">Resistance <output>{resistance} {'\u03A9'}</output></label>
            <input
              id="resistance"
              type="range"
              min={SANITY_LIMITS.resistance.min}
              max={SANITY_LIMITS.resistance.max}
              value={resistance}
              onChange={(e) => { const n = Number(e.target.value); onRequestChange('resistance', n, n > resistance ? 'up' : 'down') }}
              disabled={!!prediction}
            />
            <div className="range-labels">
              <span>{SANITY_LIMITS.resistance.min}{'\u03A9'}</span>
              <span>{SANITY_LIMITS.resistance.max}{'\u03A9'}</span>
            </div>
          </div>

          {/* Switch */}
          <div className={`switch-card${prediction ? ' is-disabled' : ''}`}>
            <div>
              <label>Switch</label>
              <p>{closed ? 'Closed — current can flow' : 'Open — circuit is off'}</p>
            </div>
            <button
              className={`switch-toggle ${closed ? 'closed' : ''}`}
              onClick={() => {
                sfx.toggle()
                onToggleSwitch()
                addToast('info', closed ? 'Switch opened — circuit off' : 'Switch closed — circuit on')
              }}
              aria-label="Toggle circuit switch"
            />
          </div>

          {/* Text command (collapsible) */}
          <div>
            <button
              className="btn-text btn-icon-inline"
              onClick={() => setShowCommand(!showCommand)}
            >
              {showCommand ? <Icon type="chevron-up" size={14} /> : <Icon type="chevron-down" size={14} />}
              {showCommand ? 'Hide' : 'Or type a command'}
            </button>
            {showCommand && (
              <div className="command-card mt-8">
                <label htmlFor="command">Describe a change in words</label>
                <div className="command-row">
                  <input
                    id="command"
                    value={command}
                    onChange={(e) => onCommandInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && command.trim()) onApplyCommand() }}
                    placeholder="e.g. increase voltage to 12"
                  />
                  <button className="btn btn-primary btn-sm" onClick={onApplyCommand}>Apply</button>
                </div>
                {commandMessage && <p className="inline-message">{commandMessage}</p>}
              </div>
            )}
          </div>

          {/* Compact mastery bars */}
          {entries.length > 0 && (
            <div className="progress-panel mt-4">
              <div className="progress-header">
                <span className="progress-title">Mastery</span>
                <span className="progress-count">{totalCorrect}/{entries.length} correct</span>
              </div>
              {onUndo && canUndo && (
                <button className="undo-btn" onClick={() => { sfx.undo(); onUndo?.() }}>
                  <Icon type="undo" size={12} /> Undo last prediction
                </button>
              )}
              {Object.entries(breakdown).map(([concept, { correct, total }]) => {
                const m = masteryLevel(correct, total)
                return (
                  <div key={concept} className="mastery-bar">
                    <div className="mastery-header">
                      <span>{conceptLabels[concept] || concept}</span>
                      <span className="mastery-score">{correct}/{total}</span>
                    </div>
                    <div className="mastery-track">
                      <div className={`mastery-fill ${m.className}`} style={{ width: `${m.percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* View progress button */}
          <button className="btn btn-outline" onClick={() => onViewChange('progress')}>
            <Icon type="trophy" size={16} />
            View your progress
          </button>
        </section>

        {/* ─── RIGHT: Discovery + SRM ─── */}
        <aside className="lab-col">
          <div className="section-label">Insights</div>

          {/* Investigation suggestion */}
          {nextInvestigation && nextInvestigation.score > 0.1 && srmSummary.totalPredictions >= 1 && (
            <div className="investigation-card">
              <div className="label">Try this next</div>
              <p className="inv-suggestion">{nextInvestigation.suggestion}</p>
              <p className="inv-reason">{nextInvestigation.reason}</p>
              {nextInvestigation.relatedMisconceptions.length > 0 && (
                <div className="tag-row">
                  {nextInvestigation.relatedMisconceptions.map(id => {
                    const def = MISCONCEPTIONS.find(m => m.id === id)
                    return def ? (
                      <span key={id} className="tag-chip">{def.label}</span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          )}

          {/* Discovery card */}
          {latestDiscovery && srmSummary.totalPredictions >= 3 && (
            <DiscoveryCard title={latestDiscovery.title} description={latestDiscovery.description} />
          )}

          {/* Challenge prompt */}
          {challengePrompt && (
            <ChallengePrompt prompt={challengePrompt} />
          )}

          {/* Did you know */}
          {solverFlags.some(f => typeof f === 'string' && f === 'ideal_zero_resistance') && (
            <div className="did-you-know">
              <span><Icon type="lightbulb" size={18} /></span>
              <div>
                <strong>Did you know?</strong>
                <p>Real bulbs have their own resistance, even though our ideal circuit starts by assuming zero.</p>
              </div>
            </div>
          )}

          {/* Correction comparison */}
          {correctionComparison && (
            <div className="comparison-card">
              <div className="row-between mb-8">
                <strong className="compare-title">YOUR CORRECTION</strong>
                <button onClick={onDismissComparison} className="icon-btn" aria-label="Dismiss">
                  <Icon type="x" size={16} />
                </button>
              </div>
              <div className="compare-list">
                {correctionComparison.changes.map((ch, i) => (
                  <div key={i} className="compare-row">
                    <strong>{ch.componentId}</strong>.{ch.field}:{' '}
                    <span className="val-original">{ch.originalValue}{ch.field === 'resistance' ? '\u03A9' : 'V'}</span>
                    {' \u2192 '}
                    <span className="val-corrected">{ch.correctedValue}{ch.field === 'resistance' ? '\u03A9' : 'V'}</span>
                  </div>
                ))}
              </div>
              <div className="compare-foot">
                {correctionComparison.originalCurrent <= 0
                  ? `Your correction gives ${correctionComparison.correctedCurrent.toFixed(3)}A — now the circuit works!`
                  : `With original values: ${correctionComparison.originalCurrent.toFixed(3)}A. Your correction: ${correctionComparison.correctedCurrent.toFixed(3)}A.`}
              </div>
            </div>
          )}

          {/* Back to setup link */}
          <button className="btn-text" onClick={() => onViewChange('confirm')}>
            &larr; Back to setup
          </button>

          {/* Reset */}
          {entries.length > 0 && (
            <button onClick={onResetStudentModel} className="link-danger">
              Reset progress
            </button>
          )}
        </aside>
      </div>
    </main>
  )
}
