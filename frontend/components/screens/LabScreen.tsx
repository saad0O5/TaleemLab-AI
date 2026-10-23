import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CircuitData, ComponentState, View, PredictionKey, Prediction,
  Explanation, SolverFlag, SANITY_LIMITS, CorrectionComparison,
  LabMode, MobileTab, CircuitComponent, Language
} from '../../lib/types'
import { STAT_COLORS } from '../../lib/colors'
import { ExampleKey, exampleLabels } from '../../lib/exampleCircuits'
import { getPredictions, getConceptBreakdown } from '../../lib/studentModel'
import {
  StudentModel, getSRMSummary, pickNextInvestigation,
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
  addComponent?: (type: CircuitComponent['type'], options?: { resistance?: number; voltage?: number; capacitance?: number; asParallelWith?: string }) => Promise<void>
  removeComponent?: (id: string) => Promise<void>
  cancelPrediction?: () => void
  labMode?: LabMode
  onLabModeChange?: (mode: LabMode) => void
  mobileTab?: MobileTab
  onMobileTabChange?: (tab: MobileTab) => void
  onSwitchSubject?: (sub: 'physics' | 'chemistry' | 'biology' | 'computer') => void
  language?: Language
  onToggleLanguage?: () => void
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
    addComponent, removeComponent, cancelPrediction,
    labMode = 'simulate', onLabModeChange,
    mobileTab = 'controls', onMobileTabChange,
    onSwitchSubject,
    language = 'en',
    onToggleLanguage
  } = props

  const [activeTab, setActiveTab] = useState<MobileTab>(mobileTab)
  const [currentMode, setCurrentMode] = useState<LabMode>(labMode)
  const [showHint, setShowHint] = useState(false)
  const [showCommand, setShowCommand] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState<string | undefined>(undefined)
  const [parallelTarget, setParallelTarget] = useState<string>('')
  const [customValue, setCustomValue] = useState<number>(220)

  const sfx = useSoundEffects()
  const { addToast } = useToast()
  const prevExplanationRef = useRef<Explanation | null>(null)
  const prevDiscoveryCountRef = useRef(0)

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab)
    onMobileTabChange?.(tab)
  }

  const handleModeChange = (mode: LabMode) => {
    setCurrentMode(mode)
    onLabModeChange?.(mode)
    if (mode === 'sandbox') {
      setActiveTab('sandbox')
    }
  }

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
      else if (e.key === 'Escape') cancelPrediction?.()
    }
  }, [prediction, predictedNext, onChangeValue, cancelPrediction])

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

  // Handle Stepper buttons for sliders
  const adjustVoltage = (delta: number) => {
    const nextVal = Math.min(SANITY_LIMITS.voltage.max, Math.max(SANITY_LIMITS.voltage.min, voltage + delta))
    if (nextVal !== voltage) {
      onRequestChange('voltage', nextVal, delta > 0 ? 'up' : 'down')
    }
  }

  const adjustResistance = (delta: number) => {
    const nextVal = Math.min(SANITY_LIMITS.resistance.max, Math.max(SANITY_LIMITS.resistance.min, resistance + delta))
    if (nextVal !== resistance) {
      onRequestChange('resistance', nextVal, delta > 0 ? 'up' : 'down')
    }
  }

  return (
    <main className="page-shell lab-page-shell">
      <TopBar
        step={3}
        onStepClick={onStepClick}
        currentView="simulate"
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      {/* ─── Compact App Header Bar ─── */}
      <div className="lab-app-header">
        <div className="lab-title-group">
          {onSwitchSubject && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-primary btn-sm" style={{ fontWeight: '800' }}>
                ⚡ Physics
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('chemistry')} title="Switch to Chemistry">
                🧪 Chemistry
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('biology')} title="Switch to Biology">
                🧬 Biology
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('computer')} title="Switch to Computer Science">
                💻 Computer
              </button>
            </div>
          )}
          <div className="mode-segmented">
            <button
              className={`mode-btn ${currentMode === 'simulate' ? 'active' : ''}`}
              onClick={() => handleModeChange('simulate')}
            >
              <Icon type="flask" size={13} />
              <span>Simulate</span>
            </button>
            <button
              className={`mode-btn ${currentMode === 'sandbox' ? 'active' : ''}`}
              onClick={() => handleModeChange('sandbox')}
            >
              <Icon type="sparkles" size={13} />
              <span>+ Sandbox Mode</span>
            </button>
          </div>
        </div>

        <div className="lab-header-controls">
          {selectedExample !== 'custom' ? (
            <select
              value={selectedExample}
              onChange={(e) => onSelectExample(e.target.value as ExampleKey)}
              aria-label="Choose a sample circuit"
              className="select-inline select-compact"
            >
              {Object.entries(exampleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          ) : (
            <button className="btn-text btn-sm" onClick={() => onViewChange('capture')}>
              <Icon type="camera" size={13} /> Retake
            </button>
          )}

          <div className="live-badge">
            <span className={`live-dot ${closed ? 'is-live' : 'is-off'}`} />
            <span>{closed ? 'LIVE CURRENT' : 'OPEN CIRCUIT'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-wrap">
          <div className="alert alert-danger">
            <Icon type="alert" size={18} />
            <div><strong>Error:</strong> {error}</div>
          </div>
        </div>
      )}

      {/* ─── Main Responsive Dual-Pane Container ─── */}
      <div className="lab-dual-container">
        
        {/* ─── PANE 1: Interactive Circuit Canvas Stage (Always visible) ─── */}
        <section className="lab-stage-pane">
          <div className="lab-bench-card">
            <div className="bench-status-row">
              <span className="bench-title">
                {currentMode === 'sandbox' ? 'Interactive Circuit Builder' : 'Live Circuit Simulation'}
              </span>
              <span className="bench-count">
                {circuit?.components.length || 0} Components
                {circuit?.topology === 'series_parallel' && ' • Parallel Branches'}
              </span>
            </div>

            {/* Circuit SVG Diagram */}
            <div className="diagram-wrapper">
              <CircuitDiagram
                circuit={circuit}
                componentStates={componentStates}
                closed={closed}
                current={current}
              />
            </div>

            {/* Floating Quick Stats HUD */}
            <div className="stats-hud">
              <div className="hud-stat" style={{ borderLeftColor: STAT_COLORS.voltage }}>
                <span className="hud-label">Voltage</span>
                <span className="hud-val">{voltage} <small>V</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: STAT_COLORS.resistance }}>
                <span className="hud-label">Resistance</span>
                <span className="hud-val">{resistance} <small>{'\u03A9'}</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: STAT_COLORS.current }}>
                <span className="hud-label">Current</span>
                <span className="hud-val">{capped ? 'Capped' : current.toFixed(3)} <small>A</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: STAT_COLORS.brightness }}>
                <span className="hud-label">Bulb</span>
                <span className="hud-val">{brightness}%</span>
              </div>
            </div>

            {/* Sandbox Quick Toolbar (Active when in Sandbox Mode) */}
            {currentMode === 'sandbox' && (
              <div className="sandbox-bar animate-fade-in">
                <div className="sandbox-bar-header">
                  <span>➕ Tap to insert component into circuit:</span>
                </div>
                <div className="sandbox-buttons">
                  <button
                    className="sandbox-btn"
                    onClick={() => {
                      sfx.click()
                      addComponent?.('resistor', { resistance: 220 })
                      addToast('success', 'Added 220Ω Resistor in series')
                    }}
                  >
                    + Resistor (220Ω)
                  </button>
                  <button
                    className="sandbox-btn"
                    onClick={() => {
                      sfx.click()
                      addComponent?.('bulb', { resistance: 30 })
                      addToast('success', 'Added Bulb (30Ω)')
                    }}
                  >
                    + Bulb
                  </button>
                  <button
                    className="sandbox-btn"
                    onClick={() => {
                      sfx.click()
                      addComponent?.('battery', { voltage: 9 })
                      addToast('success', 'Added 9V Battery')
                    }}
                  >
                    + Battery (9V)
                  </button>
                  <button
                    className="sandbox-btn"
                    onClick={() => {
                      sfx.click()
                      addComponent?.('capacitor', { capacitance: 100 })
                      addToast('success', 'Added Capacitor (100μF)')
                    }}
                  >
                    + Capacitor
                  </button>
                  <button
                    className="sandbox-btn"
                    onClick={() => {
                      sfx.click()
                      addComponent?.('switch')
                      addToast('success', 'Added Switch')
                    }}
                  >
                    + Switch
                  </button>
                </div>

                {/* Parallel Branch Option */}
                {circuit && circuit.components.filter(c => c.type === 'resistor' || c.type === 'bulb').length > 0 && (
                  <div className="parallel-insert-row">
                    <span>Or connect parallel with:</span>
                    <select
                      value={parallelTarget}
                      onChange={(e) => setParallelTarget(e.target.value)}
                      className="select-inline select-sm"
                    >
                      <option value="">Select component...</option>
                      {circuit.components
                        .filter(c => c.type === 'resistor' || c.type === 'bulb')
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.id} ({c.resistance}Ω)</option>
                        ))
                      }
                    </select>
                    <button
                      disabled={!parallelTarget}
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        if (!parallelTarget) return
                        sfx.click()
                        addComponent?.('resistor', { resistance: 200, asParallelWith: parallelTarget })
                        addToast('success', `Added parallel branch with ${parallelTarget}!`)
                        setParallelTarget('')
                      }}
                    >
                      Add Parallel Branch
                    </button>
                  </div>
                )}

                {/* Active Components Chips */}
                <div className="active-components-tray">
                  <div className="tray-label">Current components:</div>
                  <div className="chips-list">
                    {circuit?.components.map(comp => (
                      <span key={comp.id} className="component-chip">
                        <span>{comp.id}</span>
                        {comp.resistance !== undefined && <small>{comp.resistance}Ω</small>}
                        {comp.voltage !== undefined && <small>{comp.voltage}V</small>}
                        {circuit.components.length > 2 && (
                          <button
                            className="chip-del"
                            title="Remove"
                            onClick={() => {
                              sfx.click()
                              removeComponent?.(comp.id)
                              addToast('info', `Removed ${comp.id}`)
                            }}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── PANE 2: Responsive Interaction Deck ─── */}
        <section className="lab-deck-pane">
          
          {/* Mobile Navigation Tabs */}
          <div className="mobile-deck-tabs">
            <button
              className={`deck-tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => handleTabChange('controls')}
            >
              <Icon type="sliders" size={14} />
              <span>Controls</span>
            </button>
            <button
              className={`deck-tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
              onClick={() => {
                handleTabChange('sandbox')
                setCurrentMode('sandbox')
              }}
            >
              <Icon type="sparkles" size={14} />
              <span>Sandbox</span>
            </button>
            <button
              className={`deck-tab-btn ${activeTab === 'tutor' ? 'active' : ''}`}
              onClick={() => handleTabChange('tutor')}
            >
              <Icon type="brain" size={14} />
              <span>AI Tutor</span>
              {aiThinking && <span className="tab-dot-pulse" />}
            </button>
            <button
              className={`deck-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => handleTabChange('insights')}
            >
              <Icon type="trophy" size={14} />
              <span>Mastery</span>
              {discoveries.length > 0 && <span className="tab-badge">{discoveries.length}</span>}
            </button>
          </div>

          <div className="deck-scrollable-content">
            
            {/* ─── TAB 1: CONTROLS ─── */}
            {(activeTab === 'controls' || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
              <div className={`deck-section ${activeTab !== 'controls' ? 'desktop-only' : ''}`}>
                <div className="section-label">Experiment Variables</div>

                {/* Voltage Controller with Stepper Buttons */}
                <div className={`control-card ${prediction ? 'is-disabled' : ''}`}>
                  <div className="control-header">
                    <label htmlFor="voltage">Battery Voltage</label>
                    <output className="voltage-output">{voltage} V</output>
                  </div>
                  <div className="slider-with-steppers">
                    <button
                      className="stepper-btn"
                      onClick={() => adjustVoltage(-1)}
                      disabled={!!prediction || voltage <= SANITY_LIMITS.voltage.min}
                      title="Decrease by 1V"
                    >
                      −1V
                    </button>
                    <input
                      id="voltage"
                      type="range"
                      min={SANITY_LIMITS.voltage.min}
                      max={SANITY_LIMITS.voltage.max}
                      value={voltage}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        onRequestChange('voltage', n, n > voltage ? 'up' : 'down')
                      }}
                      disabled={!!prediction}
                    />
                    <button
                      className="stepper-btn"
                      onClick={() => adjustVoltage(1)}
                      disabled={!!prediction || voltage >= SANITY_LIMITS.voltage.max}
                      title="Increase by 1V"
                    >
                      +1V
                    </button>
                  </div>
                  <div className="range-labels">
                    <span>{SANITY_LIMITS.voltage.min}V</span>
                    <span>{SANITY_LIMITS.voltage.max}V</span>
                  </div>
                </div>

                {/* Resistance Controller with Stepper Buttons */}
                <div className={`control-card ${prediction ? 'is-disabled' : ''}`}>
                  <div className="control-header">
                    <label htmlFor="resistance">Total Resistance</label>
                    <output className="res-output">{resistance} {'\u03A9'}</output>
                  </div>
                  <div className="slider-with-steppers">
                    <button
                      className="stepper-btn"
                      onClick={() => adjustResistance(-50)}
                      disabled={!!prediction || resistance <= SANITY_LIMITS.resistance.min}
                      title="Decrease by 50Ω"
                    >
                      −50Ω
                    </button>
                    <input
                      id="resistance"
                      type="range"
                      min={SANITY_LIMITS.resistance.min}
                      max={SANITY_LIMITS.resistance.max}
                      step={10}
                      value={resistance}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        onRequestChange('resistance', n, n > resistance ? 'up' : 'down')
                      }}
                      disabled={!!prediction}
                    />
                    <button
                      className="stepper-btn"
                      onClick={() => adjustResistance(50)}
                      disabled={!!prediction || resistance >= SANITY_LIMITS.resistance.max}
                      title="Increase by 50Ω"
                    >
                      +50Ω
                    </button>
                  </div>
                  <div className="range-labels">
                    <span>{SANITY_LIMITS.resistance.min}{'\u03A9'}</span>
                    <span>{SANITY_LIMITS.resistance.max}{'\u03A9'}</span>
                  </div>
                </div>

                {/* Switch Toggle Card */}
                <div className={`switch-card ${prediction ? 'is-disabled' : ''}`}>
                  <div>
                    <label>Circuit Switch</label>
                    <p>{closed ? 'Closed — Complete loop (current flows)' : 'Open — Broken loop (no current)'}</p>
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

                {/* Quick Natural Language Command */}
                <div className="command-drawer">
                  <button
                    className="btn-text btn-icon-inline"
                    onClick={() => setShowCommand(!showCommand)}
                  >
                    <Icon type={showCommand ? "chevron-up" : "chevron-down"} size={13} />
                    <span>{showCommand ? 'Hide Command Box' : 'Type change in plain English'}</span>
                  </button>
                  {showCommand && (
                    <div className="command-card mt-8">
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
              </div>
            )}

            {/* ─── TAB 2: SANDBOX DRAWER ─── */}
            {activeTab === 'sandbox' && (
              <div className="deck-section">
                <div className="section-label">Sandbox Components</div>
                <p className="deck-help-text">
                  Customize the circuit by adding or removing components directly. Test series vs parallel behavior!
                </p>
                <div className="sandbox-grid-cards">
                  <div className="component-adder-card" onClick={() => addComponent?.('resistor', { resistance: 220 })}>
                    <div className="adder-icon">⚡</div>
                    <div className="adder-title">+ Resistor</div>
                    <div className="adder-desc">Adds 220Ω in series</div>
                  </div>
                  <div className="component-adder-card" onClick={() => addComponent?.('bulb', { resistance: 30 })}>
                    <div className="adder-icon">💡</div>
                    <div className="adder-title">+ Light Bulb</div>
                    <div className="adder-desc">Visual brightness indicator</div>
                  </div>
                  <div className="component-adder-card" onClick={() => addComponent?.('battery', { voltage: 9 })}>
                    <div className="adder-icon">🔋</div>
                    <div className="adder-title">+ Battery</div>
                    <div className="adder-desc">Adds 9V in series</div>
                  </div>
                  <div className="component-adder-card" onClick={() => addComponent?.('capacitor', { capacitance: 100 })}>
                    <div className="adder-icon">⏱️</div>
                    <div className="adder-title">+ Capacitor</div>
                    <div className="adder-desc">RC charging simulation</div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: AI TUTOR & Q&A ─── */}
            {(activeTab === 'tutor' || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
              <div className={`deck-section ${activeTab !== 'tutor' ? 'desktop-only' : ''}`}>
                <div className="section-label">Socratic AI Tutor</div>

                {/* AI Tutor Card */}
                <AITutorCard
                  explanation={explanation}
                  aiThinking={aiThinking}
                  onFollowUpClick={(q) => setFollowUpQuestion(q)}
                />

                {/* AI Ask Anything */}
                <div className="mt-12">
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
                </div>

                {/* Capacitor RC panel if capacitor in circuit */}
                {capacitorState && capacitorComponent && resistance > 0 && (
                  <div className="mt-12">
                    <CapacitorPanel
                      tau={(capacitorState as any).tau || (resistance * (capacitorComponent.capacitance || 100) * 1e-6)}
                      sourceVoltage={voltage}
                      totalResistance={resistance}
                      closed={closed}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 4: INSIGHTS & MASTERY ─── */}
            {(activeTab === 'insights' || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
              <div className={`deck-section ${activeTab !== 'insights' ? 'desktop-only' : ''}`}>
                <div className="section-label">Reasoning & Discoveries</div>

                {/* Next Investigation suggestion */}
                {nextInvestigation && nextInvestigation.score > 0.1 && srmSummary.totalPredictions >= 1 && (
                  <div className="investigation-card">
                    <div className="label">Next Inquiry to Try</div>
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

                {/* Latest Discovery Badge */}
                {latestDiscovery && (
                  <div className="mt-8">
                    <DiscoveryCard discovery={latestDiscovery} />
                  </div>
                )}

                {/* Challenge Prompt */}
                {challengePrompt && (
                  <div className="mt-8">
                    <ChallengePrompt prompt={challengePrompt} />
                  </div>
                )}

                {/* Mastery Progress Bars */}
                {entries.length > 0 && (
                  <div className="progress-panel mt-8">
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

                {/* View Full Progress CTA */}
                <button className="btn btn-outline w-full mt-12" onClick={() => onViewChange('progress')}>
                  <Icon type="trophy" size={16} />
                  <span>View Full Learning Journey</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ─── FLOATING ACTION BOTTOM SHEET: PREDICT FIRST ─── */}
      {prediction && (
        <div className="prediction-sheet-backdrop">
          <div className="prediction-sheet-modal animate-slide-up">
            <div className="prediction-sheet-handle" />
            <div className="prediction-sheet-header">
              <span className="prediction-pill-badge">
                <Icon type="sparkles" size={12} />
                PREDICT FIRST
              </span>
              <button
                className="prediction-close-btn"
                onClick={() => cancelPrediction?.()}
                title="Cancel change"
              >
                ✕
              </button>
            </div>

            <h2 className="prediction-sheet-question">{question}</h2>

            <div className="prediction-sheet-buttons">
              <button
                className="answer-action-btn answer-up"
                onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'up')}
              >
                <div className="action-btn-icon">▲</div>
                <div className="action-btn-text">
                  <strong>Increases</strong>
                  <small>Current will rise</small>
                </div>
                <span className="action-kbd">1</span>
              </button>

              <button
                className="answer-action-btn answer-down"
                onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'down')}
              >
                <div className="action-btn-icon">▼</div>
                <div className="action-btn-text">
                  <strong>Decreases</strong>
                  <small>Current will drop</small>
                </div>
                <span className="action-kbd">2</span>
              </button>

              <button
                className="answer-action-btn answer-same"
                onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'same')}
              >
                <div className="action-btn-icon">=</div>
                <div className="action-btn-text">
                  <strong>Stays the same</strong>
                  <small>No change in current</small>
                </div>
                <span className="action-kbd">3</span>
              </button>
            </div>

            <div className="prediction-sheet-footer">
              {!showHint ? (
                <button className="hint-btn" onClick={() => setShowHint(true)}>
                  💡 Need a physics hint?
                </button>
              ) : (
                <p className="hint-sheet-text animate-fade-in">{PREDICTION_HINTS[prediction.key]}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
