'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { CircuitComponent, CircuitData, SolverResult, ComponentState, SolverFlag } from '../lib/types'
import { recognizeCircuit, solveCircuit, applyChange, sendTextCommand } from '../lib/api'

type PredictionKey = 'resistance' | 'voltage'
type ExampleKey = 'clean_circuit' | 'battery_polarity_unset_example' | 'no_battery_example' | 'incomplete_circuit_example' | 'value_out_of_range_example' | 'ideal_zero_resistance_example'

const exampleLabels: Record<ExampleKey, string> = {
  clean_circuit: 'Clean circuit',
  battery_polarity_unset_example: 'Battery polarity unset',
  no_battery_example: 'No battery',
  incomplete_circuit_example: 'Incomplete circuit',
  value_out_of_range_example: 'Value out of range',
  ideal_zero_resistance_example: 'Ideal zero resistance',
}

const mockCircuitExamples: Record<ExampleKey, CircuitData> = {
  clean_circuit: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'open', connects_to: ['bulb_1'] },
      { id: 'bulb_1', type: 'bulb', resistance: 30, connects_to: ['battery_1'] },
    ],
  },
  battery_polarity_unset_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, connects_to: ['resistor_1'] },
      { id: 'battery_2', type: 'battery', voltage: 9, connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: [] },
    ],
  },
  no_battery_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: [] },
    ],
  },
  incomplete_circuit_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: [] },
    ],
  },
  value_out_of_range_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: -10, connects_to: [] },
    ],
  },
  ideal_zero_resistance_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'closed', connects_to: ['battery_1'] },
    ],
  },
}

const hasFlag = (flags: SolverFlag[] | undefined, flag: string) =>
  flags ? flags.some((item) => typeof item === 'string' ? item === flag : item.type === flag) : false

function Icon({ type, size = 20 }: { type: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (type === 'battery') return <svg {...p}><path d="M6 8v8M18 5v14M3 11v2M21 10v4M6 12h12" /></svg>
  if (type === 'resistor') return <svg {...p}><path d="M3 12h4l2-4 3 8 3-8 2 4h4" /></svg>
  if (type === 'switch') return <svg {...p}><path d="M3 12h6m6 0h6M9 12l5-5" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /></svg>
  if (type === 'bulb') return <svg {...p}><circle cx="12" cy="10" r="6" /><path d="M9 16h6M10 20h4" /></svg>
  if (type === 'sun') return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5m12 12L20 20M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
  return <svg {...p}><path d="m5 12 4 4L19 6" /></svg>
}

function CircuitDiagram({ closed, brightness, current }: { closed: boolean; brightness: number; current: number }) {
  return <div className={`sim-diagram ${closed ? 'is-flowing' : ''}`} style={{ '--pulse-speed': `${Math.max(.18, 2.8 - current * 12)}s` } as React.CSSProperties}>
    <svg viewBox="0 0 560 300" role="img" aria-label="Interactive rectangular circuit diagram">
      <path className="circuit-wire" d="M100 70H460V230H100V70" />
      <g className="node node-battery" transform="translate(100 70)"><path d="M0 0V-31M18 0V-50" /><text x="-4" y="-59">+</text><text x="-22" y="25">battery_1</text></g>
      <g className="node node-resistor" transform="translate(460 70)"><path d="M-32 0h9l5-11 9 22 9-22 9 11h23" /><text x="-33" y="29">resistor_1</text></g>
      <g className="node node-switch" transform="translate(460 230)"><path d="M-31 0h11m40 0h11M-20 0l24-19" /><circle cx="-20" cy="0" r="3" /><circle cx="20" cy="0" r="3" /><text x="-26" y="29">switch_1</text></g>
      <g className="node node-bulb" transform="translate(100 230)"><circle r="22" style={{ fill: `color-mix(in srgb, var(--teal) ${brightness}%, var(--surface))`, filter: brightness ? 'drop-shadow(0 0 9px var(--teal))' : 'none' }} /><path d="M-8 28h16M-5 34h10" /><text x="-23" y="55">bulb_1</text></g>
    </svg>
    <div className="diagram-caption"><span className="flow-key" /> {closed ? 'Current is flowing through the circuit' : 'Open switch — no current flow'}</div>
  </div>
}

function Stat({ label, value, unit, warning }: { label: string; value: string; unit?: string; warning?: boolean }) {
  return <div className={`stat-card ${warning ? 'stat-warning' : ''}`}><span>{label}</span><strong>{value}</strong>{unit && <small>{unit}</small>}</div>
}

export default function Page() {
  const [view, setView] = useState<'capture' | 'confirm' | 'simulate'>('capture')
  const [voltage, setVoltage] = useState(9)
  const [resistance, setResistance] = useState(470)
  const [closed, setClosed] = useState(false)
  const [prediction, setPrediction] = useState<{ key: PredictionKey; direction: 'up' | 'down'; before: number } | null>(null)
  const [explanation, setExplanation] = useState<{ correct: boolean; text: string } | null>(null)
  const [command, setCommand] = useState('')
  const [commandMessage, setCommandMessage] = useState('')
  const [selectedExample, setSelectedExample] = useState<ExampleKey | 'custom'>('clean_circuit')
  
  const [circuit, setCircuit] = useState<CircuitData | null>(null)
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectExample = async (key: ExampleKey) => {
    setSelectedExample(key)
    setLoading(true)
    setError('')
    try {
      const ex = mockCircuitExamples[key]
      const res = await solveCircuit(ex)
      setCircuit(ex)
      setSolverResult(res)
      
      const bat = ex.components.find(c => c.type === 'battery')
      const resis = ex.components.find(c => c.type === 'resistor')
      const sw = ex.components.find(c => c.type === 'switch')
      setVoltage(bat?.voltage ?? 9)
      setResistance(resis?.resistance ?? 470)
      setClosed(sw?.state === 'closed')
      
      setPrediction(null)
      setExplanation(null)
      setCommand('')
      setCommandMessage('')
      setView('simulate')
    } catch (err: any) {
      setError(err.message || 'Failed to solve example circuit.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    setError('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64 = reader.result as string
        const recognized = await recognizeCircuit(base64)
        const solved = await solveCircuit(recognized)
        
        setCircuit(recognized)
        setSolverResult(solved)
        setSelectedExample('custom')
        
        const bat = recognized.components.find(c => c.type === 'battery')
        const resis = recognized.components.find(c => c.type === 'resistor')
        const sw = recognized.components.find(c => c.type === 'switch')
        setVoltage(bat?.voltage ?? 9)
        setResistance(resis?.resistance ?? 470)
        setClosed(sw?.state === 'closed')
        
        setView('confirm')
      } catch (err: any) {
        setError(err.message || 'Failed to process circuit image.')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const current = solverResult?.current ?? 0
  const brightness = Math.round((solverResult?.componentStates?.find((state) => state.type === 'bulb')?.brightness ?? 0) * 100)
  const capped = hasFlag(solverResult?.flags, 'current_capped_for_display')

  const change = async (key: PredictionKey, next: number, direction: 'up' | 'down', answer?: string) => {
    if (!circuit) return
    const correctAnswer = key === 'resistance' ? 'down' : 'up'
    const correct = answer === correctAnswer
    
    setLoading(true)
    setError('')
    try {
      const compType = key === 'resistance' ? 'resistor' : 'battery'
      const component = circuit.components.find(c => c.type === compType)
      if (!component) throw new Error(`No ${compType} component found in the circuit.`)
      
      const res = await applyChange(circuit, component.id, key, next)
      
      const updatedComponents = circuit.components.map(c => {
        if (c.id === component.id) {
          return { ...c, [key]: next }
        }
        return c
      })
      const updatedCircuit = { ...circuit, components: updatedComponents }
      
      setCircuit(updatedCircuit)
      setSolverResult(res)
      
      if (key === 'resistance') setResistance(next); else setVoltage(next)
      setPrediction(null)
      setExplanation({ correct, text: res.explanation || (key === 'resistance' ? `Increasing resistance reduces current, so the bulb dims — that’s Ohm’s Law.` : `Increasing voltage pushes more current through the circuit, making the bulb brighter.`) })
    } catch (err: any) {
      setError(err.message || 'Failed to apply change.')
    } finally {
      setLoading(false)
    }
  }

  const requestChange = (key: PredictionKey, next: number, direction: 'up' | 'down') => setPrediction({ key, direction, before: key === 'resistance' ? resistance : voltage })

  const toggleSwitch = async () => {
    if (!circuit) return
    const sw = circuit.components.find(c => c.type === 'switch')
    if (!sw) return
    
    const nextState = closed ? 'open' : 'closed'
    setLoading(true)
    setError('')
    try {
      const res = await applyChange(circuit, sw.id, 'state', nextState)
      const updatedComponents = circuit.components.map(c => {
        if (c.id === sw.id) {
          return { ...c, state: nextState }
        }
        return c
      })
      setCircuit({ ...circuit, components: updatedComponents })
      setSolverResult(res)
      setClosed(!closed)
    } catch (err: any) {
      setError(err.message || 'Failed to toggle switch.')
    } finally {
      setLoading(false)
    }
  }

  const applyCommand = async () => {
    if (!circuit) return
    const match = command.match(/(\d+(?:\.\d+)?)/)
    if (!match) { setCommandMessage("I'm not sure what change you're going for — try something like 'set resistance to 150'."); return }
    const value = Number(match[1])
    const isResistance = command.toLowerCase().includes('resistance')
    const isVoltage = command.toLowerCase().includes('voltage') || command.toLowerCase().includes('battery')
    if (!isResistance && !isVoltage) { setCommandMessage("I'm not sure what change you're going for — try something like 'set resistance to 150'."); return }
    
    setLoading(true)
    setCommandMessage('')
    try {
      const res = await sendTextCommand(circuit, command)
      if ('recognized' in res && res.recognized === false) {
        setCommandMessage("I'm not sure what change you're going for — try something like 'set resistance to 150'.")
      } else {
        const solverRes = res as SolverResult
        setSolverResult(solverRes)
        
        const changedKey = isResistance ? 'resistance' : 'voltage'
        const direction = value > (changedKey === 'resistance' ? resistance : voltage) ? 'up' : 'down'
        
        const compType = isResistance ? 'resistor' : 'battery'
        const component = circuit.components.find(c => c.type === compType)
        if (component) {
          const updatedComponents = circuit.components.map(c => {
            if (c.id === component.id) {
              return { ...c, [changedKey]: value }
            }
            return c
          })
          setCircuit({ ...circuit, components: updatedComponents })
        }
        
        requestChange(changedKey, value, direction)
        setCommand('')
      }
    } catch (err: any) {
      setCommandMessage(err.message || 'Failed to process command.')
    } finally {
      setLoading(false)
    }
  }

  const question = prediction?.key === 'resistance' ? 'What happens to current if you increase resistance?' : 'What happens to current if you increase voltage?'
  const activeValue = prediction?.key === 'resistance' ? resistance : voltage
  const predictedNext = prediction ? (prediction.direction === 'up' ? activeValue + 1 : Math.max(1, activeValue - 1)) : activeValue

  // CAPTURE VIEW
  if (view === 'capture') {
    return <main className="sim-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">∿</span><span>Taleem<span className="brand-accent">Lab</span></span></div>
        <div className="top-actions">
          <button className="theme-button" onClick={() => document.documentElement.classList.toggle('dark')} aria-label="Toggle theme"><Icon type="sun" size={17} /></button>
          <span className="avatar">AK</span>
        </div>
      </header>
      <div className="sim-header">
        <div>
          <p className="eyebrow">GET STARTED</p>
          <h1>Capture <span>&amp;</span> analyze</h1>
          <p>Bring your hand-drawn DC circuit diagrams to life. Upload or take a photo to analyze it, or try a sample circuit.</p>
        </div>
      </div>
      <div style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px', display: 'grid', gap: '20px' }}>
        {error && (
          <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--danger)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={cameraInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />

        <button 
          className="blue-button"
          style={{ height: '54px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : '📷 Capture circuit'}
        </button>
        
        <button 
          className="literal-switch"
          style={{ height: '54px', width: '100%', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          📁 Upload a photo
        </button>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Analyzing your circuit diagram...</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
          <button 
            style={{ border: 0, background: 'none', color: 'var(--primary)', fontWeight: '800', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => selectExample('clean_circuit')}
            disabled={loading}
          >
            Try a sample circuit
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  }

  // CONFIRM VIEW PLACEHOLDER
  if (view === 'confirm') {
    return <main className="sim-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">∿</span><span>Taleem<span className="brand-accent">Lab</span></span></div>
        <div className="top-actions">
          <button className="theme-button" onClick={() => document.documentElement.classList.toggle('dark')} aria-label="Toggle theme"><Icon type="sun" size={17} /></button>
          <span className="avatar">AK</span>
        </div>
      </header>
      <div className="sim-header">
        <div>
          <p className="eyebrow">STEP 2 OF 3</p>
          <h1>Confirm <span>&amp;</span> Correct</h1>
          <p>Review the recognized circuit configuration before starting the simulation.</p>
        </div>
      </div>
      <div style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px', display: 'grid', gap: '20px' }}>
        <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3>Components list placeholder</h3>
          <p>Recognized components count: {circuit?.components.length}</p>
        </div>
        <button 
          className="blue-button" 
          style={{ height: '54px', fontSize: '16px' }}
          onClick={() => setView('simulate')}
        >
          Looks good, continue
        </button>
      </div>
    </main>
  }

  // SIMULATE VIEW
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
            <select id="example-select" value={selectedExample} onChange={(event) => selectExample(event.target.value as ExampleKey)} aria-label="Choose a mock circuit example">
              {Object.entries(exampleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>CUSTOM CAPTURED CIRCUIT</span>
            <button 
              style={{ border: 0, background: 'none', color: 'var(--primary)', fontWeight: '800', textDecoration: 'underline', fontSize: '12px' }} 
              onClick={() => setView('capture')}
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
      <section className="diagram-column"><div className="section-kicker">YOUR CIRCUIT <span>{circuit?.components.length || 0} COMPONENTS</span></div><CircuitDiagram closed={closed} brightness={brightness} current={current} /><div className="stats-grid"><Stat label="Voltage" value={voltage.toString()} unit="V" /><Stat label="Resistance" value={resistance.toString()} unit="Ω" /><Stat label="Current" value={capped ? 'Very high' : current.toFixed(3)} unit={capped ? 'real components differ' : 'A'} warning={capped} /><Stat label="Brightness" value={brightness.toString()} unit="%" /></div></section>
      <section className="controls-column"><div className="section-kicker">EXPERIMENT CONTROLS</div>{prediction && <div className="prediction-card"><span className="prediction-label">PREDICT FIRST</span><h2>{question}</h2><div className="answer-grid"><button onClick={() => change(prediction.key, predictedNext, prediction.direction, 'up')}>Increases</button><button onClick={() => change(prediction.key, predictedNext, prediction.direction, 'down')}>Decreases</button><button onClick={() => change(prediction.key, predictedNext, prediction.direction, 'same')}>Stays the same</button></div></div>}
        <div className="control-card"><label htmlFor="voltage">Battery voltage <output>{voltage} V</output></label><input id="voltage" type="range" min="1" max="24" value={voltage} onChange={(e) => { const n = Number(e.target.value); requestChange('voltage', n, n > voltage ? 'up' : 'down') }} /><div className="range-labels"><span>1V</span><span>24V</span></div></div>
        <div className="control-card"><label htmlFor="resistance">Resistor resistance <output>{resistance} Ω</output></label><input id="resistance" type="range" min="10" max="1000" value={resistance} onChange={(e) => { const n = Number(e.target.value); requestChange('resistance', n, n > resistance ? 'up' : 'down') }} /><div className="range-labels"><span>10Ω</span><span>1000Ω</span></div></div>
        <div className="control-card switch-control"><div><label>Switch</label><p>{closed ? 'Closed — current can flow' : 'Open — circuit is off'}</p></div><button className={`literal-switch ${closed ? 'closed' : ''}`} onClick={toggleSwitch} aria-label="Toggle circuit switch"><span /></button></div>
        <div className="command-card"><label htmlFor="command">Try a change in words</label><div className="command-row"><input id="command" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="e.g. increase resistance to 200 ohms" /><button className="blue-button" onClick={applyCommand}>Apply</button></div>{commandMessage && <p className="inline-message">{commandMessage}</p>}</div>
      </section>
      <aside className="explain-column"><div className="section-kicker">LEARNING NOTES</div>{explanation ? <div className={`explanation-card ${explanation.correct ? 'is-correct' : 'is-learning'}`}><div className="signal">{explanation.correct ? '✓ Nice — you were right' : '△ Not quite — here’s why'}</div><h2>What just happened?</h2><p>{explanation.text}</p></div> : <div className="explanation-card empty-explanation"><span className="note-mark">?</span><h2>What just happened?</h2><p>Make a prediction and change a control to see the physics unfold here.</p></div>}{resistance <= 25 && <div className="did-you-know"><span>∿</span><div><strong>DID YOU KNOW?</strong><p>Real bulbs have their own resistance, even though our ideal circuit starts by assuming zero.</p></div></div>}</aside>
    </div>
  </main>
}
