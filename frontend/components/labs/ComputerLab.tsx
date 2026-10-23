import { useState } from 'react'
import { Icon } from '../icons/Icon'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { useToast } from '../ui/Toast'

type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR'
type ComputerModule = 'gates' | 'half_adder' | 'binary_board'

interface ComputerLabProps {
  onSwitchSubject?: (sub: 'physics' | 'chemistry' | 'biology' | 'computer') => void
  onBackToWelcome?: () => void
}

export function ComputerLab({ onSwitchSubject, onBackToWelcome }: ComputerLabProps) {
  const [activeModule, setActiveModule] = useState<ComputerModule>('gates')

  // --- Module 1: Logic Gates State ---
  const [gate, setGate] = useState<GateType>('AND')
  const [inputA, setInputA] = useState<0 | 1>(0)
  const [inputB, setInputB] = useState<0 | 1>(0)
  const [testedRows, setTestedRows] = useState<Record<string, boolean>>({})

  // --- Module 2: Half Adder State ---
  const [adderA, setAdderA] = useState<0 | 1>(0)
  const [adderB, setAdderB] = useState<0 | 1>(0)

  // --- Module 3: 8-Bit Binary Board State ---
  const [bits, setBits] = useState<number[]>([0, 1, 0, 0, 0, 0, 0, 1]) // Default 65 = 'A'

  // Predict-First & Explanation State
  const [prediction, setPrediction] = useState<{
    type: 'gate' | 'adder' | 'binary'
    question: string
    options: { label: string; value: any; subtext?: string }[]
    correctValue: any
    explanationSuccess: string
    explanationFail: string
  } | null>(null)

  const [explanation, setExplanation] = useState<{ correct: boolean; text: string } | null>(null)

  const sfx = useSoundEffects()
  const { addToast } = useToast()

  // Compute logic gate output
  const computeOutput = (g: GateType, a: 0 | 1, b: 0 | 1): 0 | 1 => {
    switch (g) {
      case 'AND': return (a === 1 && b === 1) ? 1 : 0
      case 'OR': return (a === 1 || b === 1) ? 1 : 0
      case 'NOT': return a === 1 ? 0 : 1
      case 'NAND': return (a === 1 && b === 1) ? 0 : 1
      case 'NOR': return (a === 1 || b === 1) ? 0 : 1
      case 'XOR': return (a !== b) ? 1 : 0
      case 'XNOR': return (a === b) ? 1 : 0
      default: return 0
    }
  }

  const output = computeOutput(gate, inputA, inputB)

  // Half Adder Computations
  const adderSum = (adderA ^ adderB) as 0 | 1 // XOR
  const adderCarry = (adderA & adderB) as 0 | 1 // AND
  const adderDecimal = adderCarry * 2 + adderSum

  // Binary Board Computations
  const byteValue = bits.reduce((acc, bit, idx) => acc + bit * Math.pow(2, 7 - idx), 0)
  const hexValue = byteValue.toString(16).toUpperCase().padStart(2, '0')
  const asciiChar = byteValue >= 32 && byteValue <= 126 ? String.fromCharCode(byteValue) : '•'

  // --- Handlers for Module 1: Logic Gates ---
  const handleToggleInputA = () => {
    const nextA = inputA === 1 ? 0 : 1
    const key = `${gate}-${nextA}-${inputB}`
    if (!testedRows[key]) {
      const targetOut = computeOutput(gate, nextA, inputB)
      setPrediction({
        type: 'gate',
        question: `If Input A switches to ${nextA} while Input B is ${inputB}, what will the ${gate} gate output be?`,
        options: [
          { label: 'Output = 1 (HIGH)', value: 1, subtext: 'LED turns ON' },
          { label: 'Output = 0 (LOW)', value: 0, subtext: 'LED stays OFF' },
        ],
        correctValue: targetOut,
        explanationSuccess: `Correct! In a ${gate} gate, [${nextA}, ${inputB}] evaluates to ${targetOut}.`,
        explanationFail: `Review the rule for ${gate}: [${nextA}, ${inputB}] produces ${targetOut}.`
      })
    } else {
      setInputA(nextA)
      sfx.toggle()
    }
  }

  const handleToggleInputB = () => {
    if (gate === 'NOT') return
    const nextB = inputB === 1 ? 0 : 1
    const key = `${gate}-${inputA}-${nextB}`
    if (!testedRows[key]) {
      const targetOut = computeOutput(gate, inputA, nextB)
      setPrediction({
        type: 'gate',
        question: `If Input A is ${inputA} and Input B switches to ${nextB}, what will the ${gate} gate output be?`,
        options: [
          { label: 'Output = 1 (HIGH)', value: 1, subtext: 'LED turns ON' },
          { label: 'Output = 0 (LOW)', value: 0, subtext: 'LED stays OFF' },
        ],
        correctValue: targetOut,
        explanationSuccess: `Correct! In a ${gate} gate, [${inputA}, ${nextB}] evaluates to ${targetOut}.`,
        explanationFail: `Review the rule for ${gate}: [${inputA}, ${nextB}] produces ${targetOut}.`
      })
    } else {
      setInputB(nextB)
      sfx.toggle()
    }
  }

  // --- Handlers for Module 2: Half Adder ---
  const handleToggleAdderA = () => {
    const nextA = adderA === 1 ? 0 : 1
    if (nextA === 1 && adderB === 1) {
      // 1 + 1 binary addition predict-first
      setPrediction({
        type: 'adder',
        question: `Binary Addition: In binary, what is 1 + 1? How will the Carry and Sum LEDs respond?`,
        options: [
          { label: 'Carry=1, Sum=0 (Binary 10 = Decimal 2)', value: 'carry1_sum0', subtext: 'Overflow carry to next column' },
          { label: 'Carry=0, Sum=2 (Single LED)', value: 'carry0_sum2', subtext: 'Single decimal digit' },
          { label: 'Carry=0, Sum=1', value: 'carry0_sum1', subtext: 'Standard logic OR' }
        ],
        correctValue: 'carry1_sum0',
        explanationSuccess: 'Masterful! In base 2 (binary), 1 + 1 = 10₂ (decimal 2). The Sum bit (XOR) resets to 0 and the Carry bit (AND) fires 1 to the next power of 2!',
        explanationFail: 'Remember: In binary there is no digit "2"! When 1 + 1 occurs, the result is 10₂ (Carry=1, Sum=0).'
      })
    } else {
      setAdderA(nextA)
      sfx.toggle()
    }
  }

  const handleToggleAdderB = () => {
    const nextB = adderB === 1 ? 0 : 1
    if (adderA === 1 && nextB === 1) {
      setPrediction({
        type: 'adder',
        question: `Binary Addition: In binary, what is 1 + 1? How will the Carry and Sum LEDs respond?`,
        options: [
          { label: 'Carry=1, Sum=0 (Binary 10 = Decimal 2)', value: 'carry1_sum0', subtext: 'Overflow carry to next column' },
          { label: 'Carry=0, Sum=2 (Single LED)', value: 'carry0_sum2', subtext: 'Single decimal digit' },
          { label: 'Carry=0, Sum=1', value: 'carry0_sum1', subtext: 'Standard logic OR' }
        ],
        correctValue: 'carry1_sum0',
        explanationSuccess: 'Masterful! In base 2 (binary), 1 + 1 = 10₂ (decimal 2). The Sum bit resets to 0 and the Carry bit generates a 1.',
        explanationFail: 'In binary arithmetic, 1 + 1 = 10₂: Carry is 1 and Sum is 0.'
      })
    } else {
      setAdderB(nextB)
      sfx.toggle()
    }
  }

  // --- Handlers for Module 3: Binary Board ---
  const handleToggleBit = (index: number) => {
    const newBits = [...bits]
    const nextVal = newBits[index] === 1 ? 0 : 1
    const bitWeight = Math.pow(2, 7 - index)

    if (nextVal === 1 && bitWeight === 8) {
      // Socratic predict on bit 3 (weight 8)
      const currentDec = byteValue
      const targetDec = currentDec + 8
      setPrediction({
        type: 'binary',
        question: `Bit index 3 represents 2³ = 8. If we switch it ON, what will the total decimal byte become? (Currently ${currentDec})`,
        options: [
          { label: `${targetDec}`, value: targetDec, subtext: `${currentDec} + 8` },
          { label: `${currentDec + 3}`, value: currentDec + 3, subtext: `${currentDec} + 3` },
          { label: `${currentDec + 16}`, value: currentDec + 16, subtext: `${currentDec} + 16` }
        ],
        correctValue: targetDec,
        explanationSuccess: `Correct! Binary positional value is 2ⁿ. Bit index 3 has weight 2³ = 8, so adding it yields ${targetDec}!`,
        explanationFail: `Positional weight of bit 3 is 2³ = 2 × 2 × 2 = 8. So adding it to ${currentDec} makes ${targetDec}.`
      })
    } else {
      newBits[index] = nextVal
      setBits(newBits)
      sfx.toggle()
    }
  }

  // Answer prediction handler
  const handleAnswerPrediction = (answer: any) => {
    if (!prediction) return
    const isCorrect = answer === prediction.correctValue

    if (isCorrect) {
      sfx.correct()
      addToast('success', 'Correct prediction!')
      setExplanation({ correct: true, text: prediction.explanationSuccess })
    } else {
      sfx.wrong()
      addToast('error', 'Logic error — review the feedback')
      setExplanation({ correct: false, text: prediction.explanationFail })
    }

    if (prediction.type === 'gate') {
      const key = `${gate}-${inputA === 1 ? 0 : 1}-${inputB}`
      setTestedRows(prev => ({ ...prev, [key]: true }))
      // Update inputs to the predicted state
      if (inputA === 1) setInputA(0); else setInputA(1)
    } else if (prediction.type === 'adder') {
      setAdderA(1)
      setAdderB(1)
    } else if (prediction.type === 'binary') {
      const newBits = [...bits]
      newBits[4] = 1 // bit index 4 is 2^3 = 8
      setBits(newBits)
    }

    setPrediction(null)
  }

  return (
    <div className="lab-dual-container animate-fade-in">
      {/* ─── Top Subject & Module Navigation Bar ─── */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--surface)', padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBackToWelcome && (
            <button className="btn btn-outline btn-sm" onClick={onBackToWelcome} title="Back to All Subjects">
              ← All Labs
            </button>
          )}
          <span style={{ fontSize: '18px' }}>💻</span>
          <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--primary)' }}>
            Computer Science Lab (Grade 9–10 Matric)
          </span>
        </div>

        {/* Quick Subject Tabs */}
        {onSwitchSubject && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('physics')} title="Switch to Physics">
              ⚡ Physics
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('chemistry')} title="Switch to Chemistry">
              🧪 Chemistry
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('biology')} title="Switch to Biology">
              🧬 Biology
            </button>
            <button className="btn btn-primary btn-sm" style={{ fontWeight: '800' }}>
              💻 Computer
            </button>
          </div>
        )}
      </div>

      {/* ─── Module Selector (Gates vs Adder vs Binary) ─── */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeModule === 'gates' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setActiveModule('gates'); sfx.click() }}
        >
          🔲 1. Logic Gates & Truth Table
        </button>
        <button
          className={`btn ${activeModule === 'half_adder' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setActiveModule('half_adder'); sfx.click() }}
        >
          ➕ 2. Combinational Half Adder (ALU)
        </button>
        <button
          className={`btn ${activeModule === 'binary_board' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setActiveModule('binary_board'); sfx.click() }}
        >
          🔢 3. 8-Bit Binary Switchboard
        </button>
      </div>

      {/* ========================================================
          MODULE 1: DIGITAL LOGIC GATES & LIVE TRUTH TABLE
      ======================================================== */}
      {activeModule === 'gates' && (
        <>
          {/* Stage Pane */}
          <section className="lab-stage-pane">
            <div className="lab-bench-card">
              <div className="bench-status-row">
                <span className="bench-title">Logic Gate Schematic</span>
                <span className="bench-count">{gate} Gate • Real-Time Signal Flow</span>
              </div>

              <div className="diagram-wrapper" style={{ padding: '20px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 340 200" width="100%" style={{ maxWidth: '340px' }}>
                  {/* Wire A */}
                  <line
                    x1="40" y1="65" x2="130" y2="65"
                    stroke={inputA === 1 ? 'var(--teal)' : 'var(--muted)'}
                    strokeWidth={inputA === 1 ? 4 : 2}
                    strokeLinecap="round"
                  />
                  <text x="25" y="70" fontSize="13" fontWeight="800" fill={inputA === 1 ? 'var(--teal)' : 'var(--muted)'}>A={inputA}</text>

                  {/* Wire B (if not NOT gate) */}
                  {gate !== 'NOT' && (
                    <>
                      <line
                        x1="40" y1="135" x2="130" y2="135"
                        stroke={inputB === 1 ? 'var(--teal)' : 'var(--muted)'}
                        strokeWidth={inputB === 1 ? 4 : 2}
                        strokeLinecap="round"
                      />
                      <text x="25" y="140" fontSize="13" fontWeight="800" fill={inputB === 1 ? 'var(--teal)' : 'var(--muted)'}>B={inputB}</text>
                    </>
                  )}

                  {/* Gate Symbol Representation */}
                  <g transform="translate(130, 45)">
                    {gate === 'AND' && (
                      <path d="M 0,0 L 40,0 A 55,55 0 0,1 40,110 L 0,110 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                    )}
                    {gate === 'OR' && (
                      <path d="M 0,0 Q 30,55 0,110 Q 55,100 85,55 Q 55,10 0,0 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                    )}
                    {gate === 'NOT' && (
                      <g>
                        <polygon points="0,15 70,55 0,95" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                        <circle cx="78" cy="55" r="7" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
                      </g>
                    )}
                    {gate === 'NAND' && (
                      <g>
                        <path d="M 0,0 L 40,0 A 55,55 0 0,1 40,110 L 0,110 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                        <circle cx="85" cy="55" r="7" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
                      </g>
                    )}
                    {gate === 'NOR' && (
                      <g>
                        <path d="M 0,0 Q 30,55 0,110 Q 55,100 85,55 Q 55,10 0,0 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                        <circle cx="92" cy="55" r="7" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
                      </g>
                    )}
                    {gate === 'XOR' && (
                      <g>
                        <path d="M -12,0 Q 18,55 -12,110" fill="none" stroke="var(--primary)" strokeWidth="3" />
                        <path d="M 0,0 Q 30,55 0,110 Q 55,100 85,55 Q 55,10 0,0 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                      </g>
                    )}
                    {gate === 'XNOR' && (
                      <g>
                        <path d="M -12,0 Q 18,55 -12,110" fill="none" stroke="var(--primary)" strokeWidth="3" />
                        <path d="M 0,0 Q 30,55 0,110 Q 55,100 85,55 Q 55,10 0,0 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="3.5" />
                        <circle cx="92" cy="55" r="7" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
                      </g>
                    )}
                    <text x="35" y="60" fontSize="12" fontWeight="800" fill="var(--primary)" textAnchor="middle">{gate}</text>
                  </g>

                  {/* Output Wire */}
                  <line
                    x1="225" y1="100" x2="280" y2="100"
                    stroke={output === 1 ? 'var(--success)' : 'var(--muted)'}
                    strokeWidth={output === 1 ? 4 : 2}
                    strokeLinecap="round"
                  />

                  {/* Output LED */}
                  <circle
                    cx="295" cy="100" r="14"
                    fill={output === 1 ? '#eab308' : '#334155'}
                    stroke={output === 1 ? '#ca8a04' : '#64748b'}
                    strokeWidth="2.5"
                    filter={output === 1 ? 'drop-shadow(0 0 10px #eab308)' : 'none'}
                  />
                  <text x="295" y="130" fontSize="11" fontWeight="800" textAnchor="middle" fill={output === 1 ? 'var(--foreground)' : 'var(--muted)'}>
                    OUT = {output}
                  </text>
                </svg>

                {/* Quick Stats HUD */}
                <div className="stats-hud" style={{ width: '100%' }}>
                  <div className="hud-stat" style={{ borderLeftColor: inputA === 1 ? 'var(--teal)' : 'var(--muted)' }}>
                    <span className="hud-label">Input A</span>
                    <span className="hud-val">{inputA === 1 ? '1 (HIGH)' : '0 (LOW)'}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: inputB === 1 ? 'var(--teal)' : 'var(--muted)' }}>
                    <span className="hud-label">Input B</span>
                    <span className="hud-val">{gate === 'NOT' ? 'N/A' : (inputB === 1 ? '1 (HIGH)' : '0 (LOW)')}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: output === 1 ? 'var(--success)' : 'var(--muted)' }}>
                    <span className="hud-label">Output (Y)</span>
                    <span className="hud-val">{output === 1 ? '1 (LED ON)' : '0 (LED OFF)'}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--primary)' }}>
                    <span className="hud-label">Active Gate</span>
                    <span className="hud-val">{gate}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Deck Pane */}
          <section className="lab-deck-pane">
            <div className="deck-section">
              <div className="section-label">Select Digital Logic Gate</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {(['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'] as GateType[]).map(g => (
                  <button
                    key={g}
                    className={`btn btn-sm ${gate === g ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setGate(g); sfx.click() }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Binary Switches */}
              <div className="control-card mt-8">
                <label>Binary Input Switches</label>
                <div style={{ display: 'grid', gridTemplateColumns: gate === 'NOT' ? '1fr' : '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <button
                    className={`btn ${inputA === 1 ? 'btn-success' : 'btn-outline'}`}
                    onClick={handleToggleInputA}
                  >
                    Switch A: <strong>{inputA === 1 ? '1 (HIGH)' : '0 (LOW)'}</strong>
                  </button>
                  {gate !== 'NOT' && (
                    <button
                      className={`btn ${inputB === 1 ? 'btn-success' : 'btn-outline'}`}
                      onClick={handleToggleInputB}
                    >
                      Switch B: <strong>{inputB === 1 ? '1 (HIGH)' : '0 (LOW)'}</strong>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Truth Table */}
              <div className="control-card mt-8">
                <div className="section-label" style={{ marginBottom: '4px' }}>Live Truth Table ({gate})</div>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '6px' }}>Input A</th>
                      {gate !== 'NOT' && <th style={{ padding: '6px' }}>Input B</th>}
                      <th style={{ padding: '6px' }}>Output Y</th>
                      <th style={{ padding: '6px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { a: 0 as const, b: 0 as const },
                      { a: 0 as const, b: 1 as const },
                      { a: 1 as const, b: 0 as const },
                      { a: 1 as const, b: 1 as const },
                    ].filter(r => gate !== 'NOT' || r.b === 0).map(row => {
                      const rowOutput = computeOutput(gate, row.a, row.b)
                      const isCurrent = inputA === row.a && (gate === 'NOT' || inputB === row.b)
                      const hasTested = testedRows[`${gate}-${row.a}-${row.b}`]

                      return (
                        <tr
                          key={`${row.a}-${row.b}`}
                          style={{
                            background: isCurrent ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isCurrent ? '800' : '500',
                            borderBottom: '1px solid var(--border)'
                          }}
                        >
                          <td style={{ padding: '6px' }}>{row.a}</td>
                          {gate !== 'NOT' && <td style={{ padding: '6px' }}>{row.b}</td>}
                          <td style={{ padding: '6px', color: rowOutput === 1 ? 'var(--success)' : 'var(--muted)' }}>
                            {rowOutput}
                          </td>
                          <td style={{ padding: '6px' }}>
                            {hasTested ? '✓ Done' : isCurrent ? '• Active' : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Explanation Alert */}
              {explanation && (
                <div className={`alert ${explanation.correct ? 'alert-success' : 'alert-warning'}`}>
                  <Icon type={explanation.correct ? "check" : "alert"} size={18} />
                  <div>
                    <strong>{explanation.correct ? 'Logic Verified!' : 'Logic Rule:'}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{explanation.text}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ========================================================
          MODULE 2: COMBINATIONAL HALF ADDER (ARITHMETIC ALU)
      ======================================================== */}
      {activeModule === 'half_adder' && (
        <>
          <section className="lab-stage-pane">
            <div className="lab-bench-card">
              <div className="bench-status-row">
                <span className="bench-title">Half Adder Circuit (1-Bit Binary Addition)</span>
                <span className="bench-count">Sum = A ⊕ B (XOR) • Carry = A • B (AND)</span>
              </div>

              <div className="diagram-wrapper" style={{ padding: '20px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 360 220" width="100%" style={{ maxWidth: '360px' }}>
                  {/* Inputs */}
                  <text x="20" y="65" fontSize="13" fontWeight="800" fill={adderA === 1 ? 'var(--teal)' : 'var(--muted)'}>A = {adderA}</text>
                  <text x="20" y="155" fontSize="13" fontWeight="800" fill={adderB === 1 ? 'var(--teal)' : 'var(--muted)'}>B = {adderB}</text>

                  {/* Wire split to XOR (top) */}
                  <line x1="65" y1="60" x2="150" y2="60" stroke={adderA === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />
                  <line x1="65" y1="150" x2="110" y2="150" stroke={adderB === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />
                  <line x1="110" y1="150" x2="110" y2="85" stroke={adderB === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />
                  <line x1="110" y1="85" x2="150" y2="85" stroke={adderB === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />

                  {/* Wire split to AND (bottom) */}
                  <line x1="85" y1="60" x2="85" y2="135" stroke={adderA === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />
                  <line x1="85" y1="135" x2="150" y2="135" stroke={adderA === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />
                  <line x1="110" y1="150" x2="150" y2="150" stroke={adderB === 1 ? 'var(--teal)' : 'var(--muted)'} strokeWidth="3" />

                  {/* Junction dots */}
                  <circle cx="85" cy="60" r="4" fill="var(--teal)" />
                  <circle cx="110" cy="150" r="4" fill="var(--teal)" />

                  {/* XOR Gate (Top) */}
                  <g transform="translate(150, 40) scale(0.65)">
                    <path d="M -12,0 Q 18,55 -12,110" fill="none" stroke="var(--primary)" strokeWidth="4" />
                    <path d="M 0,0 Q 30,55 0,110 Q 55,100 85,55 Q 55,10 0,0 Z" fill="var(--surface-soft)" stroke="var(--primary)" strokeWidth="4" />
                    <text x="35" y="60" fontSize="16" fontWeight="800" fill="var(--primary)" textAnchor="middle">XOR</text>
                  </g>
                  {/* XOR Output Line */}
                  <line x1="210" y1="75" x2="280" y2="75" stroke={adderSum === 1 ? 'var(--success)' : 'var(--muted)'} strokeWidth="4" />
                  <circle cx="300" cy="75" r="12" fill={adderSum === 1 ? '#eab308' : '#334155'} stroke={adderSum === 1 ? '#ca8a04' : '#64748b'} strokeWidth="2" filter={adderSum === 1 ? 'drop-shadow(0 0 8px #eab308)' : 'none'} />
                  <text x="320" y="80" fontSize="12" fontWeight="800" fill="var(--foreground)">SUM = {adderSum}</text>

                  {/* AND Gate (Bottom) */}
                  <g transform="translate(150, 115) scale(0.65)">
                    <path d="M 0,0 L 40,0 A 55,55 0 0,1 40,110 L 0,110 Z" fill="var(--surface-soft)" stroke="var(--teal)" strokeWidth="4" />
                    <text x="25" y="60" fontSize="16" fontWeight="800" fill="var(--teal)" textAnchor="middle">AND</text>
                  </g>
                  {/* AND Output Line */}
                  <line x1="205" y1="150" x2="280" y2="150" stroke={adderCarry === 1 ? 'var(--success)' : 'var(--muted)'} strokeWidth="4" />
                  <circle cx="300" cy="150" r="12" fill={adderCarry === 1 ? '#eab308' : '#334155'} stroke={adderCarry === 1 ? '#ca8a04' : '#64748b'} strokeWidth="2" filter={adderCarry === 1 ? 'drop-shadow(0 0 8px #eab308)' : 'none'} />
                  <text x="320" y="155" fontSize="12" fontWeight="800" fill="var(--foreground)">CARRY = {adderCarry}</text>
                </svg>

                {/* Stats HUD */}
                <div className="stats-hud" style={{ width: '100%' }}>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--teal)' }}>
                    <span className="hud-label">Calculation</span>
                    <span className="hud-val">{adderA} + {adderB}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--primary)' }}>
                    <span className="hud-label">Binary Result</span>
                    <span className="hud-val">{adderCarry}{adderSum}₂</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--success)' }}>
                    <span className="hud-label">Decimal Value</span>
                    <span className="hud-val">{adderDecimal}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: '#eab308' }}>
                    <span className="hud-label">Hardware Stage</span>
                    <span className="hud-val">1-Bit ALU</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="lab-deck-pane">
            <div className="deck-section">
              <div className="section-label">Half Adder Inputs</div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 10px' }}>
                Toggle binary switches A and B to observe how two basic logic gates perform physical arithmetic.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  className={`btn ${adderA === 1 ? 'btn-success' : 'btn-outline'}`}
                  onClick={handleToggleAdderA}
                >
                  Input Bit A: <strong>{adderA}</strong>
                </button>
                <button
                  className={`btn ${adderB === 1 ? 'btn-success' : 'btn-outline'}`}
                  onClick={handleToggleAdderB}
                >
                  Input Bit B: <strong>{adderB}</strong>
                </button>
              </div>

              {/* Addition Truth Table */}
              <div className="control-card mt-8">
                <div className="section-label" style={{ marginBottom: '4px' }}>Half Adder Truth Table</div>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '6px' }}>A</th>
                      <th style={{ padding: '6px' }}>B</th>
                      <th style={{ padding: '6px' }}>Carry (A • B)</th>
                      <th style={{ padding: '6px' }}>Sum (A ⊕ B)</th>
                      <th style={{ padding: '6px' }}>Binary Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { a: 0, b: 0, c: 0, s: 0, res: '00₂ (0)' },
                      { a: 0, b: 1, c: 0, s: 1, res: '01₂ (1)' },
                      { a: 1, b: 0, c: 0, s: 1, res: '01₂ (1)' },
                      { a: 1, b: 1, c: 1, s: 0, res: '10₂ (2)' },
                    ].map(row => {
                      const isCurrent = adderA === row.a && adderB === row.b
                      return (
                        <tr
                          key={`${row.a}-${row.b}`}
                          style={{
                            background: isCurrent ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isCurrent ? '800' : '500',
                            borderBottom: '1px solid var(--border)'
                          }}
                        >
                          <td style={{ padding: '6px' }}>{row.a}</td>
                          <td style={{ padding: '6px' }}>{row.b}</td>
                          <td style={{ padding: '6px', color: row.c === 1 ? 'var(--success)' : 'inherit' }}>{row.c}</td>
                          <td style={{ padding: '6px', color: row.s === 1 ? 'var(--success)' : 'inherit' }}>{row.s}</td>
                          <td style={{ padding: '6px' }}>{row.res}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {explanation && (
                <div className={`alert ${explanation.correct ? 'alert-success' : 'alert-warning'}`}>
                  <Icon type={explanation.correct ? "check" : "alert"} size={18} />
                  <div>
                    <strong>{explanation.correct ? 'Hardware Insight:' : 'Review Arithmetic:'}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{explanation.text}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ========================================================
          MODULE 3: 8-BIT BINARY NUMBER SYSTEM EXPLORER
      ======================================================== */}
      {activeModule === 'binary_board' && (
        <>
          <section className="lab-stage-pane">
            <div className="lab-bench-card">
              <div className="bench-status-row">
                <span className="bench-title">8-Bit Data Byte Register (Grade 9 CS Unit 2)</span>
                <span className="bench-count">Positional Value: 2⁷ to 2⁰</span>
              </div>

              <div className="diagram-wrapper" style={{ padding: '24px 16px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {/* 8 Bits Graphic Switches */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', width: '100%', maxWidth: '420px' }}>
                  {bits.map((bit, idx) => {
                    const power = 7 - idx
                    const weight = Math.pow(2, power)
                    const isOn = bit === 1

                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleBit(idx)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px 4px',
                          borderRadius: '8px',
                          border: isOn ? '2px solid var(--success)' : '1px solid var(--border)',
                          background: isOn ? 'var(--surface-soft)' : 'var(--surface)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700' }}>2^{power}</span>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: isOn ? 'var(--teal)' : 'var(--muted)', margin: '2px 0' }}>{weight}</span>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isOn ? '#eab308' : '#334155',
                            border: isOn ? '2px solid #ca8a04' : '2px solid #64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '800',
                            color: isOn ? '#000' : '#94a3b8',
                            boxShadow: isOn ? '0 0 10px #eab308' : 'none'
                          }}
                        >
                          {bit}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Multibase Readout Panel */}
                <div className="stats-hud" style={{ width: '100%', marginTop: '24px' }}>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--primary)' }}>
                    <span className="hud-label">Decimal (Base 10)</span>
                    <span className="hud-val">{byteValue}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--teal)' }}>
                    <span className="hud-label">Binary (Base 2)</span>
                    <span className="hud-val" style={{ fontSize: '13px' }}>{bits.join('')}₂</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: 'var(--warning)' }}>
                    <span className="hud-label">Hex (Base 16)</span>
                    <span className="hud-val">0x{hexValue}</span>
                  </div>
                  <div className="hud-stat" style={{ borderLeftColor: '#ec4899' }}>
                    <span className="hud-label">ASCII Symbol</span>
                    <span className="hud-val">&apos;{asciiChar}&apos;</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="lab-deck-pane">
            <div className="deck-section">
              <div className="section-label">Number Systems & Memory Representation</div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
                Every character, integer, and color in computer memory is stored as an 8-bit byte. Tap individual bit switches to observe conversions in real time.
              </p>

              {/* Preset Characters */}
              <div className="control-card">
                <label>Try Matric Practical Test Presets</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setBits([0, 1, 0, 0, 0, 0, 0, 1]); sfx.click() }}
                  >
                    &apos;A&apos; (65)
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setBits([0, 0, 0, 0, 1, 1, 1, 1]); sfx.click() }}
                  >
                    15 (0x0F)
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setBits([1, 1, 1, 1, 1, 1, 1, 1]); sfx.click() }}
                  >
                    255 (0xFF)
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setBits([0, 0, 0, 0, 0, 0, 0, 0]); sfx.click() }}
                  >
                    0 (Clear)
                  </button>
                </div>
              </div>

              {explanation && (
                <div className={`alert ${explanation.correct ? 'alert-success' : 'alert-warning'}`}>
                  <Icon type={explanation.correct ? "check" : "alert"} size={18} />
                  <div>
                    <strong>{explanation.correct ? 'Binary Insight:' : 'Number System Check:'}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{explanation.text}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ─── Predict-First Modal ─── */}
      {prediction && (
        <div className="prediction-sheet-backdrop">
          <div className="prediction-sheet-modal animate-slide-up">
            <div className="prediction-sheet-header">
              <span className="prediction-pill-badge">
                <Icon type="sparkles" size={12} />
                PREDICT FIRST: COMPUTER SCIENCE
              </span>
            </div>
            <h2 className="prediction-sheet-question">{prediction.question}</h2>
            <div className="prediction-sheet-buttons" style={{ flexDirection: 'column', gap: '8px' }}>
              {prediction.options.map((opt, i) => (
                <button
                  key={i}
                  className="answer-action-btn answer-up"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px' }}
                  onClick={() => handleAnswerPrediction(opt.value)}
                >
                  <div className="action-btn-icon">💡</div>
                  <div className="action-btn-text" style={{ textAlign: 'left' }}>
                    <strong>{opt.label}</strong>
                    {opt.subtext && <small>{opt.subtext}</small>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
