import { useState } from 'react'
import { Icon } from '../icons/Icon'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { useToast } from '../ui/Toast'
import { recordPrediction } from '../../lib/studentModel'

type Indicator = 'phenolphthalein' | 'litmus'

interface ChemistryLabProps {
  onSwitchSubject?: (sub: 'physics' | 'chemistry' | 'biology' | 'computer') => void
  onBackToWelcome?: () => void
}

export function ChemistryLab({ onSwitchSubject, onBackToWelcome }: ChemistryLabProps) {
  const [acidVolume] = useState(25) // mL of 0.1M HCl
  const [baseAdded, setBaseAdded] = useState(20) // mL of 0.1M NaOH added
  const [indicator, setIndicator] = useState<Indicator>('phenolphthalein')
  const [prediction, setPrediction] = useState<{
    targetBase: number
    question: string
  } | null>(null)
  const [explanation, setExplanation] = useState<{
    correct: boolean
    text: string
  } | null>(null)

  const sfx = useSoundEffects()
  const { addToast } = useToast()

  // Calculate pH based on strong acid (HCl) + strong base (NaOH) titration
  // Equivalence point is at exactly 25 mL
  const calculatePH = (baseVol: number) => {
    const diff = baseVol - acidVolume
    if (Math.abs(diff) < 0.05) return 7.0 // Neutral
    if (diff < 0) {
      // Excess acid
      const remainingMolesH = (acidVolume - baseVol) * 0.1 * 1e-3
      const totalVolL = (acidVolume + baseVol) * 1e-3
      const concH = remainingMolesH / totalVolL
      return Math.min(6.9, Math.max(1.0, -Math.log10(concH)))
    } else {
      // Excess base
      const remainingMolesOH = (baseVol - acidVolume) * 0.1 * 1e-3
      const totalVolL = (acidVolume + baseVol) * 1e-3
      const concOH = remainingMolesOH / totalVolL
      const pOH = -Math.log10(concOH)
      return Math.min(13.5, Math.max(7.1, 14 - pOH))
    }
  }

  const currentPH = Number(calculatePH(baseAdded).toFixed(1))

  // Determine liquid color
  const getLiquidColor = (ph: number, ind: Indicator) => {
    if (ind === 'phenolphthalein') {
      if (ph < 8.2) return 'rgba(230, 240, 255, 0.4)' // Colorless/clear
      const intensity = Math.min(1, (ph - 8.2) / 1.5)
      return `rgba(236, 72, 153, ${0.3 + intensity * 0.6})` // Bright magenta pink
    } else {
      // Litmus: Red in acid (ph < 7), Purple at 7, Blue in base (ph > 7)
      if (ph < 6.8) return 'rgba(239, 68, 68, 0.65)' // Red
      if (ph > 7.2) return 'rgba(59, 130, 246, 0.7)' // Blue
      return 'rgba(168, 85, 247, 0.65)' // Purple
    }
  }

  const liquidColor = getLiquidColor(currentPH, indicator)

  const handleRequestAdd = (amount: number) => {
    const nextBase = Math.min(50, Math.max(0, baseAdded + amount))
    const crossingEquivalence = (baseAdded < 25 && nextBase >= 25) || (baseAdded <= 24 && nextBase >= 25)
    
    // Trigger prediction hook if crossing neutralization
    if (crossingEquivalence) {
      setPrediction({
        targetBase: nextBase,
        question: `You are adding base past 25mL. What will happen to the ${indicator} indicator color?`
      })
    } else {
      setBaseAdded(nextBase)
      sfx.toggle()
    }
  }

  const handleAnswerPrediction = (answer: 'pink_or_blue' | 'colorless_or_red' | 'no_change') => {
    if (!prediction) return
    const nextPH = calculatePH(prediction.targetBase)
    const nextColor = getLiquidColor(nextPH, indicator)
    const isBasic = nextPH > 7.5

    const correct = (isBasic && answer === 'pink_or_blue') || (!isBasic && answer === 'colorless_or_red')

    if (correct) {
      sfx.correct()
      addToast('success', 'Correct! Sudden color change at the equivalence point!')
      setExplanation({
        correct: true,
        text: `Exactly right! At 25.0 mL of base, all H+ ions from HCl are neutralized by OH- ions. The next fraction of a drop creates excess OH-, causing the pH to shoot up sharply and ${indicator === 'phenolphthalein' ? 'turn magenta pink' : 'turn blue'}.`
      })
    } else {
      sfx.wrong()
      addToast('error', 'Not quite — observe the sharp indicator shift')
      setExplanation({
        correct: false,
        text: `Notice that titration has an equivalence point! Below 25mL, acid dominates. But passing 25mL creates excess base, instantly changing the indicator color.`
      })
    }

    recordPrediction({
      concept: 'titration',
      correct,
      timestamp: Date.now(),
      subject: 'chemistry',
    })

    setBaseAdded(prediction.targetBase)
    setPrediction(null)
  }

  return (
    <div className="lab-dual-container animate-fade-in">
      {/* ─── Top Subject Navigation Bar ─── */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--surface)', padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBackToWelcome && (
            <button className="btn btn-outline btn-sm" onClick={onBackToWelcome} title="Back to All Subjects">
              ← All Labs
            </button>
          )}
          <span style={{ fontSize: '18px' }}>🧪</span>
          <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--teal)' }}>
            Chemistry Lab: Acid–Base Titration (Grade 10 Matric)
          </span>
        </div>

        {/* Quick Subject Tabs */}
        {onSwitchSubject && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('physics')} title="Switch to Physics">
              ⚡ Physics
            </button>
            <button className="btn btn-primary btn-sm" style={{ fontWeight: '800' }}>
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
      </div>

      {/* ─── Flask Stage ─── */}
      <section className="lab-stage-pane">
        <div className="lab-bench-card">
          <div className="bench-status-row">
            <span className="bench-title">Acid–Base Titration (Grade 10 Chem)</span>
            <span className="bench-count">HCl + NaOH Neutralization</span>
          </div>

          <div className="diagram-wrapper" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 320 280" width="100%" style={{ maxWidth: '320px' }}>
              {/* Burette Tip at Top */}
              <rect x="154" y="0" width="12" height="50" fill="#94a3b8" rx="2" />
              <polygon points="152,50 168,50 160,65" fill="#64748b" />
              <circle cx="160" cy="72" r="3.5" fill="rgba(59, 130, 246, 0.8)" className="animate-pulse" />

              {/* Erlenmeyer Flask Outline */}
              <path
                d="M 130,95 L 145,95 L 145,130 L 70,240 Q 60,255 80,255 L 240,255 Q 260,255 250,240 L 175,130 L 175,95 L 190,95"
                fill="none"
                stroke="var(--border)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Liquid inside Flask */}
              <path
                d={`M ${145 - (baseAdded / 50) * 40},${250 - (baseAdded / 50) * 60} 
                    L ${175 + (baseAdded / 50) * 40},${250 - (baseAdded / 50) * 60} 
                    L 245,245 Q 252,253 238,253 L 82,253 Q 68,253 75,245 Z`}
                fill={liquidColor}
                style={{ transition: 'fill 0.4s ease, d 0.2s ease' }}
              />

              {/* Measurement Marks */}
              <line x1="120" y1="210" x2="135" y2="210" stroke="var(--muted)" strokeWidth="1.5" />
              <text x="140" y="213" fontSize="10" fill="var(--muted)" fontWeight="700">25 mL</text>

              <line x1="130" y1="180" x2="145" y2="180" stroke="var(--muted)" strokeWidth="1.5" />
              <text x="150" y="183" fontSize="10" fill="var(--muted)" fontWeight="700">50 mL</text>

              {/* Stirring vortex bubble */}
              <circle cx="160" cy="235" r="4" fill="white" opacity="0.6" />
              <circle cx="155" cy="225" r="2.5" fill="white" opacity="0.5" />
            </svg>

            {/* Live pH Meter Readout */}
            <div className="stats-hud" style={{ width: '100%' }}>
              <div className="hud-stat" style={{ borderLeftColor: currentPH < 7 ? 'var(--danger)' : currentPH > 7 ? 'var(--primary)' : 'var(--success)' }}>
                <span className="hud-label">Digital pH</span>
                <span className="hud-val">{currentPH} <small>{currentPH < 7 ? '(Acidic)' : currentPH > 7 ? '(Basic)' : '(Neutral)'}</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: 'var(--teal)' }}>
                <span className="hud-label">NaOH Added</span>
                <span className="hud-val">{baseAdded} <small>mL</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: 'var(--warning)' }}>
                <span className="hud-label">HCl in Flask</span>
                <span className="hud-val">{acidVolume} <small>mL</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: '#ec4899' }}>
                <span className="hud-label">Indicator</span>
                <span className="hud-val" style={{ fontSize: '12px' }}>{indicator === 'phenolphthalein' ? 'Phenolph.' : 'Litmus'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* ─── Controls & Socratic Deck ─── */}
        <section className="lab-deck-pane">
          <div className="deck-section">
            <div className="section-label">Burette Dispenser Controls</div>

            {/* Dropper Actions */}
            <div className="control-card">
              <label>Add 0.1M NaOH (Base) from Burette</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                <button className="btn btn-outline" onClick={() => handleRequestAdd(1)}>+1 mL Drop</button>
                <button className="btn btn-primary" onClick={() => handleRequestAdd(5)}>+5 mL Pour</button>
                <button className="btn btn-outline" onClick={() => setBaseAdded(0)}>Reset Flask</button>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                  <span>Volume: {baseAdded} mL / 50 mL</span>
                  <span>Equivalence at 25 mL</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.5"
                  value={baseAdded}
                  onChange={(e) => setBaseAdded(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
            </div>

            {/* Indicator Selector */}
            <div className="control-card">
              <label>Select pH Indicator Dropped</label>
              <div className="pill-group" style={{ marginTop: '8px' }}>
                <button
                  className={`pill ${indicator === 'phenolphthalein' ? 'active-blue' : ''}`}
                  onClick={() => setIndicator('phenolphthalein')}
                >
                  Phenolphthalein (Clear ↔ Pink)
                </button>
                <button
                  className={`pill ${indicator === 'litmus' ? 'active-green' : ''}`}
                  onClick={() => setIndicator('litmus')}
                >
                  Litmus Paper (Red ↔ Blue)
                </button>
              </div>
            </div>

            {/* Socratic Explanation */}
            {explanation && (
              <div className={`alert ${explanation.correct ? 'alert-success' : 'alert-warning'}`}>
                <Icon type={explanation.correct ? "check" : "alert"} size={18} />
                <div>
                  <strong>{explanation.correct ? 'Brilliant deduction!' : 'Key concept to remember:'}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{explanation.text}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── Predict-First Modal ─── */}
        {prediction && (
          <div className="prediction-sheet-backdrop">
            <div className="prediction-sheet-modal animate-slide-up">
              <div className="prediction-sheet-header">
                <span className="prediction-pill-badge">
                  <Icon type="sparkles" size={12} />
                  PREDICT FIRST: EQUIVALENCE POINT
                </span>
              </div>
              <h2 className="prediction-sheet-question">{prediction.question}</h2>
              <div className="prediction-sheet-buttons">
                <button
                  className="answer-action-btn answer-up"
                  onClick={() => handleAnswerPrediction('pink_or_blue')}
                >
                  <div className="action-btn-icon">🌸</div>
                  <div className="action-btn-text">
                    <strong>{indicator === 'phenolphthalein' ? 'Turns Bright Pink' : 'Turns Blue'}</strong>
                    <small>Becomes basic</small>
                  </div>
                </button>
                <button
                  className="answer-action-btn answer-down"
                  onClick={() => handleAnswerPrediction('colorless_or_red')}
                >
                  <div className="action-btn-icon">💧</div>
                  <div className="action-btn-text">
                    <strong>{indicator === 'phenolphthalein' ? 'Stays Colorless' : 'Stays Red'}</strong>
                    <small>Remains acidic</small>
                  </div>
                </button>
                <button
                  className="answer-action-btn answer-same"
                  onClick={() => handleAnswerPrediction('no_change')}
                >
                  <div className="action-btn-icon">=</div>
                  <div className="action-btn-text">
                    <strong>No color change</strong>
                    <small>No effect</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
