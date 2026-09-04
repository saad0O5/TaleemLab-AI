import { useState, useEffect, useCallback } from 'react'
import {
  CircuitData, ComponentState, View, PredictionKey, Prediction,
  Explanation, SolverFlag, SANITY_LIMITS
} from '../../lib/types'
import { ExampleKey, exampleLabels } from '../../lib/exampleCircuits'
import { getPredictions, getConceptBreakdown } from '../../lib/studentModel'
import {
  StudentModel, getSRMSummary, getEvidenceSummary, pickNextInvestigation,
  MISCONCEPTIONS
} from '../../lib/studentModel'
import { getLatestDiscovery, getChallengePrompt } from '../../lib/engagement'
import { TopBar } from '../ui/TopBar'
import { AITutorCard } from '../ui/AITutorCard'
import { DiscoveryCard } from '../ui/DiscoveryCard'
import { ChallengePrompt } from '../ui/ChallengePrompt'
import { Icon } from '../icons/Icon'
import { CircuitDiagram } from '../circuit/CircuitDiagram'
import { Stat } from '../circuit/Stat'

const PREDICTION_HINTS: Record<PredictionKey, string> = {
  resistance: "Remember Ohm's Law relates voltage, current, and resistance -- what does increasing one side do to the other?",
  voltage: "Think about the relationship between the push (voltage) and the flow (current) -- if the push gets stronger, what happens?",
  state: "Consider what a switch controls -- does it affect the path for current, or the amount of push?",
}

interface CorrectionComparison {
  changes: { componentId: string; field: string; originalValue: number; correctedValue: number }[]
  originalCurrent: number
  correctedCurrent: number
  originalTotalResistance: number | null
  correctedTotalResistance: number | null
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

  return (
    <main className="page-shell">
      <TopBar step={3} onStepClick={onStepClick} currentView="simulate" />

      <div className="sim-header">
        <div>
          <p className="eyebrow">Experiment</p>
          <h1>Your lab <span>bench</span></h1>
          <p>Change one thing at a time. Predict what happens first, then see your AI tutor&apos;s response.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {selectedExample !== 'custom' ? (
            <select
              value={selectedExample}
              onChange={(e) => onSelectExample(e.target.value as ExampleKey)}
              aria-label="Choose a sample circuit"
              style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '600', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--foreground)' }}
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
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div className="alert alert-danger"><Icon type="alert" size={18} /><div><strong>Error:</strong> {error}</div></div>
        </div>
      )}

      <div className="sim-layout">
        {/* ─── LEFT: Lab Bench + AI Tutor ─── */}
        <section style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>
          <div className="lab-bench">
            <div className="lab-bench-label">
              <span>Your experiment</span>
              <span style={{ fontWeight: '600', color: 'var(--muted-light)' }}>{circuit?.components.length || 0} components</span>
            </div>
            <CircuitDiagram circuit={circuit} componentStates={componentStates} closed={closed} current={current} />
            <div className="stats-grid">
              <Stat label="Voltage" value={voltage.toString()} unit="V" />
              <Stat label="Resistance" value={resistance.toString()} unit={'\u03A9'} />
              <Stat label="Current" value={capped ? 'Very high' : current.toFixed(3)} unit={capped ? 'real components differ' : 'A'} warning={capped} />
              <Stat label="Brightness" value={brightness.toString()} unit="%" />
            </div>
          </div>

          {/* AI Tutor Card -- the hero */}
          <AITutorCard explanation={explanation} aiThinking={aiThinking} />
        </section>

        {/* ─── CENTER: Controls ─── */}
        <section style={{ display: 'grid', gap: '10px', alignContent: 'start' }}>
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
          <div className="control-card" style={{ opacity: prediction ? 0.5 : 1, pointerEvents: prediction ? 'none' : 'auto' }}>
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
          <div className="control-card" style={{ opacity: prediction ? 0.5 : 1, pointerEvents: prediction ? 'none' : 'auto' }}>
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
          <div className="switch-card" style={{ opacity: prediction ? 0.5 : 1, pointerEvents: prediction ? 'none' : 'auto' }}>
            <div>
              <label>Switch</label>
              <p>{closed ? 'Closed -- current can flow' : 'Open -- circuit is off'}</p>
            </div>
            <button
              className={`switch-toggle ${closed ? 'closed' : ''}`}
              onClick={onToggleSwitch}
              aria-label="Toggle circuit switch"
            />
          </div>

          {/* Text command (collapsible) */}
          <div>
            <button
              className="btn-text"
              onClick={() => setShowCommand(!showCommand)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {showCommand ? <Icon type="chevron-up" size={14} /> : <Icon type="chevron-down" size={14} />}
              {showCommand ? 'Hide' : 'Or type a command'}
            </button>
            {showCommand && (
              <div className="command-card" style={{ marginTop: '8px' }}>
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
            <div className="progress-panel" style={{ marginTop: '4px' }}>
              <div className="progress-header">
                <span className="progress-title">Mastery</span>
                <span className="progress-count">{totalCorrect}/{entries.length} correct</span>
              </div>
              {onUndo && canUndo && (
                <button className="undo-btn" onClick={onUndo}>
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
        <aside style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>
          <div className="section-label">Insights</div>

          {/* Investigation suggestion */}
          {nextInvestigation && nextInvestigation.score > 0.1 && srmSummary.totalPredictions >= 1 && (
            <div className="investigation-card">
              <div className="label">Try this next</div>
              <p style={{ fontSize: '13px', color: 'var(--foreground)', margin: '4px 0 0', lineHeight: '1.45', fontWeight: '600' }}>
                {nextInvestigation.suggestion}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: '1.4' }}>
                {nextInvestigation.reason}
              </p>
              {nextInvestigation.relatedMisconceptions.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {nextInvestigation.relatedMisconceptions.map(id => {
                    const def = MISCONCEPTIONS.find(m => m.id === id)
                    return def ? (
                      <span key={id} style={{ fontSize: '9px', padding: '3px 8px', background: 'var(--surface-soft)', borderRadius: '6px', color: 'var(--muted)', fontWeight: '700' }}>
                        {def.label}
                      </span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '11px', color: 'var(--primary)', letterSpacing: '1px' }}>YOUR CORRECTION</strong>
                <button onClick={onDismissComparison} style={{ border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }} aria-label="Dismiss">
                  <Icon type="x" size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gap: '4px', marginBottom: '8px' }}>
                {correctionComparison.changes.map((ch, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--foreground)' }}>
                    <strong>{ch.componentId}</strong>.{ch.field}:{' '}
                    <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{ch.originalValue}{ch.field === 'resistance' ? '\u03A9' : 'V'}</span>
                    {' \u2192 '}
                    <span style={{ color: 'var(--success)', fontWeight: '700' }}>{ch.correctedValue}{ch.field === 'resistance' ? '\u03A9' : 'V'}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                {correctionComparison.originalCurrent <= 0
                  ? `Your correction gives ${correctionComparison.correctedCurrent.toFixed(3)}A -- now the circuit works!`
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
            <button
              onClick={onResetStudentModel}
              style={{ border: 0, background: 'none', color: 'var(--danger)', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
            >
              Reset progress
            </button>
          )}
        </aside>
      </div>
    </main>
  )
}
