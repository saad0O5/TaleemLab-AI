import { useMemo } from 'react'
import { CircuitData, SolverResult, View, EducationalContext } from '../../lib/types'
import { TopBar } from '../ui/TopBar'
import { Icon } from '../icons/Icon'

function friendlyId(id: string): string {
  const match = id.match(/^(\w+?)_(\d+)$/)
  if (!match) return id
  const [, type, num] = match
  return `${type.charAt(0).toUpperCase() + type.slice(1)} ${num}`
}

interface SetupScreenProps {
  circuit: CircuitData | null
  solverResult: SolverResult | null
  error: string
  onUpdateComponentValue: (componentId: string, field: string, value: number | string) => void
  onAddBattery: () => void
  onAutoCompleteCircuit: () => void
  onViewChange: (view: View) => void
  onContinueToSimulate: () => void
  onStepClick?: (step: number) => void
}

export function SetupScreen({ circuit, solverResult, error, onUpdateComponentValue, onAddBattery, onAutoCompleteCircuit, onViewChange, onContinueToSimulate, onStepClick }: SetupScreenProps) {
  const flags = solverResult?.flags || []
  const hasPolarityUnset = flags.some(f => f === 'battery_polarity_unset')
  const hasNoBattery = flags.some(f => f === 'no_battery_detected')
  const hasIncomplete = flags.some(f => f === 'incomplete_circuit')
  const outOfRangeFlags = flags.filter((f): f is { type: 'value_out_of_range'; componentId: string; field: string; value: number } =>
    typeof f === 'object' && f.type === 'value_out_of_range'
  )
  const hasOutOfRange = outOfRangeFlags.length > 0

  const uncertainSet = new Set<string>()
  if (circuit?.uncertain_fields) {
    for (const path of circuit.uncertain_fields) uncertainSet.add(path)
  }
  const isUncertain = (componentId: string, field: string) => uncertainSet.has(`${componentId}.${field}`)
  const hasUncertain = uncertainSet.size > 0
  const canContinue = !hasPolarityUnset && !hasNoBattery && !hasIncomplete && !hasOutOfRange

  const eduCtx: EducationalContext | undefined = circuit?.educational_context

  // AI Confidence meter
  const confidence = useMemo(() => {
    let score = 100
    if (circuit?.uncertain_fields) score -= circuit.uncertain_fields.length * 5
    if (eduCtx?.concerns) score -= eduCtx.concerns.length * 8
    if (hasNoBattery) score -= 15
    if (hasIncomplete) score -= 15
    if (hasPolarityUnset) score -= 15
    if (hasOutOfRange) score -= 5
    return Math.max(10, Math.min(100, score))
  }, [circuit, eduCtx, hasNoBattery, hasIncomplete, hasPolarityUnset, hasOutOfRange])

  return (
    <main className="page-shell">
      <TopBar step={2} onStepClick={onStepClick} currentView="confirm" />

      <div className="page-header">
        <p className="eyebrow">Step 2 of 4</p>
        <h1>Check your <span>setup</span></h1>
        <p>Review what the AI recognized. Fix anything that looks wrong before you start experimenting.</p>
      </div>

      <div className="page-body">
        {/* Back link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-text" onClick={() => onViewChange('capture')}>
            &larr; Retake photo
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger">
            <Icon type="alert" size={18} />
            <div><strong>Error:</strong> {error}</div>
          </div>
        )}

        {/* ─── AI Confidence Meter ─── */}
        {circuit && (
          <div className="confidence-meter">
            <div className="confidence-meter-label">
              <Icon type="sparkles" size={12} />
              <span>AI Recognition Confidence</span>
            </div>
            <div className="confidence-meter-bar">
              <div className="confidence-meter-fill" style={{ width: `${confidence}%` }} />
            </div>
            <div className="confidence-meter-text">
              {confidence}% confident
            </div>
            {eduCtx?.likely_topic && (
              <div className="confidence-meter-topic">
                This looks like a <strong>{eduCtx.likely_topic}</strong> circuit
              </div>
            )}
          </div>
        )}

        {/* ─── Educational Context Card (from AI recognition) ─── */}
        {eduCtx && (eduCtx.intent || eduCtx.likely_topic) && (
          <div className="edu-context-card">
            <div className="edu-context-label">
              <Icon type="lightbulb" size={12} />
              <span>AI Recognition</span>
            </div>
            {eduCtx.intent && (
              <div className="edu-context-intent">{eduCtx.intent}</div>
            )}
            {eduCtx.likely_topic && (
              <div className="edu-context-topic">
                Likely topic: <strong>{eduCtx.likely_topic}</strong>
              </div>
            )}
            {eduCtx.observations && eduCtx.observations.length > 0 && (
              <div className="edu-context-observations">
                {eduCtx.observations.map((obs, i) => (
                  <span key={i}>
                    <Icon type="check" size={10} /> {obs}
                  </span>
                ))}
              </div>
            )}
            {eduCtx.concerns && eduCtx.concerns.length > 0 && (
              <div className="edu-context-concerns">
                {eduCtx.concerns.map((c, i) => (
                  <span key={i}>
                    <Icon type="alert" size={10} /> {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocking warnings */}
        {hasNoBattery && (
          <div className="alert alert-danger">
            <Icon type="alert" size={18} />
            <div>
              <strong>No power source found.</strong> A circuit needs a battery to work.
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={onAddBattery}>+ Add a battery</button>
                <button className="btn btn-outline btn-sm" onClick={() => onViewChange('capture')}>Retake photo</button>
              </div>
            </div>
          </div>
        )}

        {hasIncomplete && (
          <div className="alert alert-warning">
            <Icon type="alert" size={18} />
            <div>
              <strong>Circuit is not a complete loop.</strong> Current can only flow in a closed path.
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={onAutoCompleteCircuit}>Auto-complete</button>
                <button className="btn btn-outline btn-sm" onClick={() => onViewChange('capture')}>Retake photo</button>
              </div>
            </div>
          </div>
        )}

        {hasPolarityUnset && (
          <div className="alert alert-warning">
            <Icon type="alert" size={18} />
            <div><strong>Battery direction not set.</strong> Please choose which way each battery faces.</div>
          </div>
        )}

        {hasOutOfRange && (
          <div className="alert alert-warning">
            <Icon type="alert" size={18} />
            <div><strong>Some values look off.</strong> Check the highlighted fields below.</div>
          </div>
        )}

        {hasUncertain && (
          <div className="alert alert-warning" style={{ opacity: 0.9 }}>
            <Icon type="alert" size={18} />
            <div><strong>Not sure about some values.</strong> The AI wasn&apos;t fully confident reading the highlighted fields. Please check them.</div>
          </div>
        )}

        {/* Component list */}
        <div>
          <div className="section-label">
            Recognized components ({circuit?.components.length || 0})
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {circuit?.components.map((c) => {
              const voltageFlag = outOfRangeFlags.some(f => f.componentId === c.id && f.field === 'voltage')
              const resistanceFlag = outOfRangeFlags.some(f => f.componentId === c.id && f.field === 'resistance')
              const voltageUncertain = isUncertain(c.id, 'voltage')
              const resistanceUncertain = isUncertain(c.id, 'resistance')

              return (
                <div key={c.id} className="component-card">
                  <div className="component-badge">
                    <Icon type={c.type} size={20} />
                  </div>
                  <div style={{ flex: '1 1 auto', minWidth: '120px' }}>
                    <div className="component-name">{friendlyId(c.id)}</div>
                    <div className="component-type">{c.type}</div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                    {(c.type === 'resistor' || c.type === 'bulb') && (
                      <div className="component-field">
                        <label>Resistance</label>
                        <input
                          type="number"
                          className={resistanceFlag ? 'danger' : resistanceUncertain ? 'warning' : ''}
                          value={c.resistance ?? ''}
                          onChange={(e) => onUpdateComponentValue(c.id, 'resistance', Number(e.target.value))}
                        />
                        <span className="unit">{'\u03A9'}</span>
                      </div>
                    )}

                    {c.type === 'battery' && (
                      <>
                        <div className="component-field">
                          <label>Voltage</label>
                          <input
                            type="number"
                            className={voltageFlag ? 'danger' : voltageUncertain ? 'warning' : ''}
                            value={c.voltage ?? ''}
                            onChange={(e) => onUpdateComponentValue(c.id, 'voltage', Number(e.target.value))}
                          />
                          <span className="unit">V</span>
                        </div>
                        <div className="component-field">
                          <label>Direction</label>
                          <div className="pill-group">
                            <button
                              type="button"
                              className={`pill ${c.polarity === 'same' ? 'active-green' : ''}`}
                              onClick={() => onUpdateComponentValue(c.id, 'polarity', 'same')}
                            >
                              Same (+/-)
                            </button>
                            <button
                              type="button"
                              className={`pill ${c.polarity === 'reversed' ? 'active-red' : ''}`}
                              onClick={() => onUpdateComponentValue(c.id, 'polarity', 'reversed')}
                            >
                              Reversed
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {c.type === 'switch' && (
                      <div className="component-field">
                        <label>State</label>
                        <div className="pill-group">
                          <button
                            type="button"
                            className={`pill ${c.state === 'open' ? 'active-gray' : ''}`}
                            onClick={() => onUpdateComponentValue(c.id, 'state', 'open')}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            className={`pill ${c.state === 'closed' ? 'active-blue' : ''}`}
                            onClick={() => onUpdateComponentValue(c.id, 'state', 'closed')}
                          >
                            Closed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Continue button */}
        {canContinue ? (
          <button className="btn btn-success" onClick={onContinueToSimulate}>
            <Icon type="check" size={18} />
            Looks good, start experiment
          </button>
        ) : (
          <button className="btn btn-outline" disabled>
            Please fix the issues above to continue
          </button>
        )}
      </div>
    </main>
  )
}
