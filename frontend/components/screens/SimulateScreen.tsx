import { CircuitData, ComponentState, View, PredictionKey, Prediction, Explanation, SolverFlag, SANITY_LIMITS } from '../../lib/types'
import { ExampleKey, exampleLabels } from '../../lib/exampleCircuits'
import { Icon } from '../icons/Icon'
import { CircuitDiagram } from '../circuit/CircuitDiagram'
import { Stat } from '../circuit/Stat'

interface SimulateScreenProps {
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
  onSelectExample: (key: ExampleKey) => void
  onViewChange: (view: View) => void
  onChangeValue: (key: PredictionKey, next: number | string, direction: 'up' | 'down', answer?: string) => void
  onRequestChange: (key: PredictionKey, next: any, direction: 'up' | 'down', componentId?: string) => void
  onToggleSwitch: () => void
  onCommandInputChange: (value: string) => void
  onApplyCommand: () => void
}

export function SimulateScreen({ selectedExample, circuit, componentStates, solverFlags, error, voltage, resistance, closed, current, brightness, capped, prediction, question, predictedNext, command, commandMessage, explanation, onSelectExample, onViewChange, onChangeValue, onRequestChange, onToggleSwitch, onCommandInputChange, onApplyCommand }: SimulateScreenProps) {
  const hasIdealZeroResistance = solverFlags.some(f => typeof f === 'string' && f === 'ideal_zero_resistance')
  const showIdealZeroCard = hasIdealZeroResistance || resistance <= 25
  const correctSignal = "✓ Nice — you were right"
  const learningSignal = "△ Not quite — here's why"
  return <main className="sim-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">∿</span><span>Taleem<span className="brand-accent">Lab</span></span></div>
      <div className="top-actions">
        <span className="step-label">STEP <b>3</b> OF 3</span>
        <button className="theme-button" onClick={() => document.documentElement.classList.toggle('dark')} aria-label="Toggle theme"><Icon type="sun" size={17} /></button>
        <span className="avatar">AK</span>
      </div>
    </header>
    <div className="sim-header">
      <div>
        <p className="eyebrow">CIRCUIT LAB / EXPERIMENT</p>
        <h1>Simulate <span>&amp;</span> explain</h1>
        <p>Change one variable at a time. Predict what will happen, then test your thinking.</p>
      </div>
      <div className="header-tools">
        {selectedExample !== 'custom' ? (
          <label htmlFor="example-select">
            MOCK EXAMPLE
            <select id="example-select" value={selectedExample} onChange={(event) => onSelectExample(event.target.value as ExampleKey)} aria-label="Choose a mock circuit example">
              {Object.entries(exampleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>CUSTOM CAPTURED CIRCUIT</span>
            <button 
              style={{ border: 0, background: 'none', color: 'var(--primary)', fontWeight: '800', textDecoration: 'underline', fontSize: '12px' }} 
              onClick={() => onViewChange('capture')}
            >
              📷 Capture New
            </button>
          </div>
        )}
        <div className="synced"><Icon type="check" size={15} /> MODEL READY</div>
      </div>
    </div>
    {error && <div className="max-w-7xl mx-auto px-7 mb-4"><div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded"><strong>Error:</strong> {error}</div></div>}
    <div className="sim-layout">
      <section className="diagram-column"><div className="section-kicker">YOUR CIRCUIT <span>{circuit?.components.length || 0} COMPONENTS</span></div><CircuitDiagram circuit={circuit} componentStates={componentStates} closed={closed} current={current} /><div className="stats-grid"><Stat label="Voltage" value={voltage.toString()} unit="V" /><Stat label="Resistance" value={resistance.toString()} unit="Ω" /><Stat label="Current" value={capped ? 'Very high' : current.toFixed(3)} unit={capped ? 'real components differ' : 'A'} warning={capped} /><Stat label="Brightness" value={brightness.toString()} unit="%" /></div></section>
      <section className="controls-column"><div className="section-kicker">EXPERIMENT CONTROLS</div>{prediction && <div className="prediction-card"><span className="prediction-label">PREDICT FIRST</span><h2>{question}</h2><div className="answer-grid"><button onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'up')}>Increases</button><button onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'down')}>Decreases</button><button onClick={() => onChangeValue(prediction.key, predictedNext, prediction.direction, 'same')}>Stays the same</button></div></div>}
        <div className="control-card"><label htmlFor="voltage">Battery voltage <output>{voltage} V</output></label><input id="voltage" type="range" min={SANITY_LIMITS.voltage.min} max={SANITY_LIMITS.voltage.max} value={voltage} onChange={(e) => { const n = Number(e.target.value); onRequestChange('voltage', n, n > voltage ? 'up' : 'down') }} /><div className="range-labels"><span>{SANITY_LIMITS.voltage.min}V</span><span>{SANITY_LIMITS.voltage.max}V</span></div></div>
        <div className="control-card"><label htmlFor="resistance">Resistor resistance <output>{resistance} Ω</output></label><input id="resistance" type="range" min={SANITY_LIMITS.resistance.min} max={SANITY_LIMITS.resistance.max} value={resistance} onChange={(e) => { const n = Number(e.target.value); onRequestChange('resistance', n, n > resistance ? 'up' : 'down') }} /><div className="range-labels"><span>{SANITY_LIMITS.resistance.min}Ω</span><span>{SANITY_LIMITS.resistance.max}Ω</span></div></div>
        <div className="control-card switch-control"><div><label>Switch</label><p>{closed ? 'Closed — current can flow' : 'Open — circuit is off'}</p></div><button className={`literal-switch ${closed ? 'closed' : ''}`} onClick={onToggleSwitch} aria-label="Toggle circuit switch"><span /></button></div>
        <div className="command-card"><label htmlFor="command">Try a change in words</label><div className="command-row"><input id="command" value={command} onChange={(e) => onCommandInputChange(e.target.value)} placeholder="e.g. increase resistance to 200 ohms" /><button className="blue-button" onClick={onApplyCommand}>Apply</button></div>{commandMessage && <p className="inline-message">{commandMessage}</p>}</div>
      </section>
      <aside className="explain-column">
        <div className="section-kicker">LEARNING NOTES</div>
        {explanation ? (
          <div className={`explanation-card ${explanation.correct ? 'is-correct' : 'is-learning'}`}>
            <div className="signal">{explanation.correct ? correctSignal : learningSignal}</div>
            <h2>What just happened?</h2>
            <p>{explanation.text}</p>
          </div>
        ) : (
          <div className="explanation-card empty-explanation">
            <span className="note-mark">?</span>
            <h2>What just happened?</h2>
            <p>Make a prediction and change a control to see the physics unfold here.</p>
          </div>
        )}
        {showIdealZeroCard && (
          <div className="did-you-know">
            <span>∿</span>
            <div>
              <strong>DID YOU KNOW?</strong>
              <p>Real bulbs have their own resistance, even though our ideal circuit starts by assuming zero.</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  </main>
}
