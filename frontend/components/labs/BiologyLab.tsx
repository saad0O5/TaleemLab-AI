import { useState } from 'react'
import { Icon } from '../icons/Icon'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import { useToast } from '../ui/Toast'
import { recordPrediction } from '../../lib/studentModel'

interface BiologyLabProps {
  onSwitchSubject?: (sub: 'physics' | 'chemistry' | 'biology' | 'computer') => void
  onBackToWelcome?: () => void
}

export function BiologyLab({ onSwitchSubject, onBackToWelcome }: BiologyLabProps) {
  const [parent1, setParent1] = useState<{ allele1: 'B' | 'b'; allele2: 'B' | 'b' }>({ allele1: 'B', allele2: 'b' })
  const [parent2, setParent2] = useState<{ allele1: 'B' | 'b'; allele2: 'B' | 'b' }>({ allele1: 'B', allele2: 'b' })
  const [simulatedOffspring, setSimulatedOffspring] = useState<{ id: number; genotype: string; phenotype: string }[]>([])
  const [prediction, setPrediction] = useState<{ question: string } | null>(null)
  const [explanation, setExplanation] = useState<{ correct: boolean; text: string } | null>(null)

  const sfx = useSoundEffects()
  const { addToast } = useToast()

  // Calculate 4 square combinations
  const cells = [
    { p1: parent1.allele1, p2: parent2.allele1, genotype: `${parent1.allele1}${parent2.allele1}` },
    { p1: parent1.allele1, p2: parent2.allele2, genotype: `${parent1.allele1}${parent2.allele2}` },
    { p1: parent1.allele2, p2: parent2.allele1, genotype: `${parent1.allele2}${parent2.allele1}` },
    { p1: parent1.allele2, p2: parent2.allele2, genotype: `${parent1.allele2}${parent2.allele2}` },
  ].map(c => {
    // Sort so uppercase B comes first
    const sorted = c.genotype.includes('B') && c.genotype.includes('b') ? 'Bb' : c.genotype
    const isDominant = sorted.includes('B')
    return {
      ...c,
      genotype: sorted,
      phenotype: isDominant ? 'Brown Eyes (Dominant)' : 'Blue Eyes (Recessive)',
      isDominant
    }
  })

  const recessiveCount = cells.filter(c => !c.isDominant).length
  const theoreticalRecessivePct = (recessiveCount / 4) * 100

  // Run experimental simulation trial of 20 offspring
  const runBreedingTrial = () => {
    if (simulatedOffspring.length === 0) {
      // First trial: trigger predict-first!
      setPrediction({
        question: `Theoretical probability of blue eyes is ${theoreticalRecessivePct}%. If we breed 20 offspring, are we GUARANTEED to get exactly ${20 * (theoreticalRecessivePct / 100)} blue-eyed offspring?`
      })
      return
    }

    generateTrial()
  }

  const generateTrial = () => {
    sfx.click()
    const p1Alleles = [parent1.allele1, parent1.allele2]
    const p2Alleles = [parent2.allele1, parent2.allele2]
    const trial = []

    for (let i = 1; i <= 20; i++) {
      const a1 = p1Alleles[Math.floor(Math.random() * 2)]
      const a2 = p2Alleles[Math.floor(Math.random() * 2)]
      const raw = `${a1}${a2}`
      const sorted = raw.includes('B') && raw.includes('b') ? 'Bb' : raw
      const isDom = sorted.includes('B')
      trial.push({
        id: i,
        genotype: sorted,
        phenotype: isDom ? 'Brown' : 'Blue'
      })
    }
    setSimulatedOffspring(trial)
    addToast('success', 'Generated 20 offspring genetics trial!')
  }

  const handleAnswerPrediction = (answer: 'guaranteed' | 'probabilistic') => {
    const isCorrect = answer === 'probabilistic'
    if (isCorrect) {
      sfx.correct()
      addToast('success', 'Spot on! Genetics is probabilistic!')
      setExplanation({
        correct: true,
        text: "Correct! Punnett squares show the probability for EACH conception, like flipping a coin. You are never guaranteed an exact ratio in real life—only an average over thousands of trials."
      })
    } else {
      sfx.wrong()
      addToast('error', 'Common misconception! Genetics is probability, not a quota.')
      setExplanation({
        correct: false,
        text: "Important distinction: A 25% chance means each baby has a 1 in 4 chance. Just like flipping tails twice in a row, real families can have 4 brown-eyed or 4 blue-eyed children by chance!"
      })
    }
    recordPrediction({
      concept: 'genetics',
      correct: isCorrect,
      timestamp: Date.now(),
      subject: 'biology',
    })

    setPrediction(null)
    generateTrial()
  }

  const actualBlueCount = simulatedOffspring.filter(o => o.phenotype === 'Blue').length

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
          <span style={{ fontSize: '18px' }}>🧬</span>
          <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--warning)' }}>
            Biology Lab: Genetics & Inheritance (Grade 10 Matric)
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
            <button className="btn btn-primary btn-sm" style={{ fontWeight: '800' }}>
              🧬 Biology
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onSwitchSubject('computer')} title="Switch to Computer Science">
              💻 Computer
            </button>
          </div>
        )}
      </div>

      {/* ─── Punnett Canvas Stage ─── */}
      <section className="lab-stage-pane">
        <div className="lab-bench-card">
          <div className="bench-status-row">
            <span className="bench-title">Genetics & Inheritance (Grade 10 Bio)</span>
            <span className="bench-count">Monohybrid Cross: B (Brown) vs b (Blue)</span>
          </div>

          <div className="diagram-wrapper" style={{ padding: '20px', minHeight: '320px' }}>
            {/* 2x2 Punnett Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px 110px 110px', gap: '8px', margin: '0 auto', maxWidth: '300px' }}>
              <div />
              <div style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary)', fontSize: '18px' }}>{parent1.allele1}</div>
              <div style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary)', fontSize: '18px' }}>{parent1.allele2}</div>

              {/* Row 1 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--teal)', fontSize: '18px' }}>
                {parent2.allele1}
              </div>
              <div style={{ background: cells[0].isDominant ? 'var(--primary-light)' : 'var(--warning-light)', padding: '16px 8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: cells[0].isDominant ? 'var(--primary)' : 'var(--warning)' }}>{cells[0].genotype}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', marginTop: '4px' }}>{cells[0].phenotype.split(' ')[0]}</div>
              </div>
              <div style={{ background: cells[1].isDominant ? 'var(--primary-light)' : 'var(--warning-light)', padding: '16px 8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: cells[1].isDominant ? 'var(--primary)' : 'var(--warning)' }}>{cells[1].genotype}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', marginTop: '4px' }}>{cells[1].phenotype.split(' ')[0]}</div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--teal)', fontSize: '18px' }}>
                {parent2.allele2}
              </div>
              <div style={{ background: cells[2].isDominant ? 'var(--primary-light)' : 'var(--warning-light)', padding: '16px 8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: cells[2].isDominant ? 'var(--primary)' : 'var(--warning)' }}>{cells[2].genotype}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', marginTop: '4px' }}>{cells[2].phenotype.split(' ')[0]}</div>
              </div>
              <div style={{ background: cells[3].isDominant ? 'var(--primary-light)' : 'var(--warning-light)', padding: '16px 8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: cells[3].isDominant ? 'var(--primary)' : 'var(--warning)' }}>{cells[3].genotype}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', marginTop: '4px' }}>{cells[3].phenotype.split(' ')[0]}</div>
              </div>
            </div>

            {/* Theoretical Ratios */}
            <div className="stats-hud" style={{ width: '100%', marginTop: '20px' }}>
              <div className="hud-stat" style={{ borderLeftColor: 'var(--primary)' }}>
                <span className="hud-label">Brown Eyes (Dominant)</span>
                <span className="hud-val">{100 - theoreticalRecessivePct}% <small>({4 - recessiveCount}/4)</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: 'var(--warning)' }}>
                <span className="hud-label">Blue Eyes (Recessive)</span>
                <span className="hud-val">{theoreticalRecessivePct}% <small>({recessiveCount}/4)</small></span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: 'var(--teal)' }}>
                <span className="hud-label">Genotypic Ratio</span>
                <span className="hud-val" style={{ fontSize: '13px' }}>1 BB : 2 Bb : 1 bb</span>
              </div>
              <div className="hud-stat" style={{ borderLeftColor: 'var(--success)' }}>
                <span className="hud-label">Phenotypic Ratio</span>
                <span className="hud-val">3 : 1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Controls & Trial Simulator Deck ─── */}
      <section className="lab-deck-pane">
        <div className="deck-section">
          <div className="section-label">Parent Genotype Selectors</div>

          {/* Parent 1 */}
          <div className="control-card">
            <label>Mother (Parent 1 Alleles)</label>
            <div className="pill-group" style={{ marginTop: '8px' }}>
              <button
                className={`pill ${parent1.allele1 === 'B' && parent1.allele2 === 'B' ? 'active-blue' : ''}`}
                onClick={() => setParent1({ allele1: 'B', allele2: 'B' })}
              >
                BB (Homozygous Dominant)
              </button>
              <button
                className={`pill ${parent1.allele1 === 'B' && parent1.allele2 === 'b' ? 'active-blue' : ''}`}
                onClick={() => setParent1({ allele1: 'B', allele2: 'b' })}
              >
                Bb (Heterozygous)
              </button>
              <button
                className={`pill ${parent1.allele1 === 'b' && parent1.allele2 === 'b' ? 'active-blue' : ''}`}
                onClick={() => setParent1({ allele1: 'b', allele2: 'b' })}
              >
                bb (Homozygous Recessive)
              </button>
            </div>
          </div>

          {/* Parent 2 */}
          <div className="control-card">
            <label>Father (Parent 2 Alleles)</label>
            <div className="pill-group" style={{ marginTop: '8px' }}>
              <button
                className={`pill ${parent2.allele1 === 'B' && parent2.allele2 === 'B' ? 'active-green' : ''}`}
                onClick={() => setParent2({ allele1: 'B', allele2: 'B' })}
              >
                BB (Homozygous Dominant)
              </button>
              <button
                className={`pill ${parent2.allele1 === 'B' && parent2.allele2 === 'b' ? 'active-green' : ''}`}
                onClick={() => setParent2({ allele1: 'B', allele2: 'b' })}
              >
                Bb (Heterozygous)
              </button>
              <button
                className={`pill ${parent2.allele1 === 'b' && parent2.allele2 === 'b' ? 'active-green' : ''}`}
                onClick={() => setParent2({ allele1: 'b', allele2: 'b' })}
              >
                bb (Homozygous Recessive)
              </button>
            </div>
          </div>

          {/* Virtual Breeding Trial */}
          <div className="control-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label>Real-World Trial Simulator</label>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                  Roll the dice to breed 20 random offspring:
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={runBreedingTrial}>
                🎲 Breed 20 Offspring
              </button>
            </div>

            {simulatedOffspring.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', marginBottom: '6px' }}>
                  <span>Results: {20 - actualBlueCount} Brown ({((20 - actualBlueCount)/20)*100}%)</span>
                  <span style={{ color: 'var(--warning)' }}>{actualBlueCount} Blue ({((actualBlueCount)/20)*100}%)</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {simulatedOffspring.map(o => (
                    <span
                      key={o.id}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        fontWeight: '800',
                        borderRadius: '4px',
                        background: o.phenotype === 'Brown' ? 'var(--primary-light)' : 'var(--warning-light)',
                        color: o.phenotype === 'Brown' ? 'var(--primary)' : 'var(--warning)',
                      }}
                    >
                      {o.genotype}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Socratic Explanation */}
          {explanation && (
            <div className={`alert ${explanation.correct ? 'alert-success' : 'alert-warning'}`}>
              <Icon type={explanation.correct ? "check" : "alert"} size={18} />
              <div>
                <strong>{explanation.correct ? 'Genetics Insight:' : 'Key Misconception Alert:'}</strong>
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
                PREDICT FIRST: INHERITANCE
              </span>
            </div>
            <h2 className="prediction-sheet-question">{prediction.question}</h2>
            <div className="prediction-sheet-buttons">
              <button
                className="answer-action-btn answer-up"
                onClick={() => handleAnswerPrediction('probabilistic')}
              >
                <div className="action-btn-icon">🎲</div>
                <div className="action-btn-text">
                  <strong>No, it&apos;s a probability</strong>
                  <small>Real counts vary randomly</small>
                </div>
              </button>
              <button
                className="answer-action-btn answer-down"
                onClick={() => handleAnswerPrediction('guaranteed')}
              >
                <div className="action-btn-icon">🔒</div>
                <div className="action-btn-text">
                  <strong>Yes, guaranteed ratio</strong>
                  <small>Always exactly 5 out of 20</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
