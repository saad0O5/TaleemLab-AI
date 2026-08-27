import { CircuitData, SolverResult, View } from '../../lib/types'
import { Icon } from '../icons/Icon'

interface ConfirmScreenProps {
  circuit: CircuitData | null
  solverResult: SolverResult | null
  error: string
  onUpdateComponentValue: (componentId: string, field: string, value: number | string) => void
  onAddBattery: () => void
  onAutoCompleteCircuit: () => void
  onViewChange: (view: View) => void
}

export function ConfirmScreen({ circuit, solverResult, error, onUpdateComponentValue, onAddBattery, onAutoCompleteCircuit, onViewChange }: ConfirmScreenProps) {
  const flags = solverResult?.flags || []
  const hasPolarityUnset = flags.some(f => f === 'battery_polarity_unset')
  const hasNoBattery = flags.some(f => f === 'no_battery_detected')
  const hasIncomplete = flags.some(f => f === 'incomplete_circuit')
  
  const outOfRangeFlags = flags.filter((f): f is { type: 'value_out_of_range'; componentId: string; field: string; value: number } => 
    typeof f === 'object' && f.type === 'value_out_of_range'
  )
  const hasOutOfRange = outOfRangeFlags.length > 0
  
  const canContinue = !hasPolarityUnset && !hasNoBattery && !hasIncomplete && !hasOutOfRange

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
        <p>Review the recognized circuit configuration below. Adjust components or values to fix any issues.</p>
      </div>
      <button 
        onClick={() => onViewChange('capture')}
        style={{ border: 0, background: 'none', color: 'var(--muted)', fontWeight: '800', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
      >
        ← Retake Photo
      </button>
    </div>

    <div style={{ maxWidth: '700px', margin: '30px auto', padding: '0 20px', display: 'grid', gap: '20px' }}>
      {error && (
        <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--danger)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Warning messages */}
      {hasPolarityUnset && (
        <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--warning)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <strong>Polarity Unset:</strong> Please set the orientation for all batteries.
        </div>
      )}
      {hasNoBattery && (
        <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--danger)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong>No Power Source:</strong> No power source detected.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={onAddBattery}
              className="blue-button"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              + Add a battery
            </button>
            <button
              onClick={() => onViewChange('capture')}
              style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
            >
              Retake photo
            </button>
          </div>
        </div>
      )}
      {hasIncomplete && (
        <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--warning)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong>Incomplete Loop:</strong> This circuit isn't a complete loop. Check for a break in the connections.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={onAutoCompleteCircuit}
              className="blue-button"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Auto-complete this circuit
            </button>
            <button
              onClick={() => onViewChange('capture')}
              style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
            >
              Retake photo
            </button>
          </div>
        </div>
      )}
      {hasOutOfRange && (
        <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--warning)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <strong>Value Warning:</strong> One or more fields have values out of range. Check highlighted fields.
        </div>
      )}

      {/* Component list */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 15px', background: 'var(--background)', borderBottom: '1px solid var(--border)', fontWeight: '800', fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Recognized Components ({circuit?.components.length || 0})
        </div>
        <div style={{ display: 'grid' }}>
          {circuit?.components.map((c) => {
            const voltageFlag = outOfRangeFlags.some(f => f.componentId === c.id && f.field === 'voltage')
            const resistanceFlag = outOfRangeFlags.some(f => f.componentId === c.id && f.field === 'resistance')
            
            return (
              <div key={c.id} style={{ padding: '15px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '8px', background: 'var(--surface-soft)', borderRadius: '4px', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                    <Icon type={c.type} size={20} />
                  </span>
                  <div>
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>{c.id}</span>
                    <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{c.type}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {(c.type === 'resistor' || c.type === 'bulb') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold' }}>Resistance:</label>
                      <input
                        type="number"
                        style={{ width: '90px', padding: '4px 8px', textAlign: 'right', fontSize: '13px', border: resistanceFlag ? '2px solid var(--danger)' : '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', borderRadius: '3px' }}
                        value={c.resistance ?? ''}
                        onChange={(e) => onUpdateComponentValue(c.id, 'resistance', Number(e.target.value))}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Ω</span>
                    </div>
                  )}

                  {c.type === 'battery' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold' }}>Voltage:</label>
                        <input
                          type="number"
                          style={{ width: '75px', padding: '4px 8px', textAlign: 'right', fontSize: '13px', border: voltageFlag ? '2px solid var(--danger)' : '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', borderRadius: '3px' }}
                          value={c.voltage ?? ''}
                          onChange={(e) => onUpdateComponentValue(c.id, 'voltage', Number(e.target.value))}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>V</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold' }}>Direction:</label>
                        <button
                          type="button"
                          className="literal-switch"
                          style={{ 
                            height: '28px', 
                            width: '120px', 
                            fontSize: '11px', 
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: c.polarity === 'reversed' ? 'rgba(240, 68, 56, 0.1)' : c.polarity === 'same' ? 'rgba(18, 183, 106, 0.1)' : 'var(--surface-soft)', 
                            color: c.polarity === 'reversed' ? 'var(--danger)' : c.polarity === 'same' ? 'var(--success)' : 'var(--muted)', 
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            fontWeight: 'bold',
                            clipPath: 'none'
                          }}
                          onClick={() => onUpdateComponentValue(c.id, 'polarity', c.polarity === 'same' ? 'reversed' : 'same')}
                        >
                          {c.polarity === 'reversed' ? 'Reversed (–/+)' : c.polarity === 'same' ? 'Same (+/–)' : 'Unset'}
                        </button>
                      </div>
                    </div>
                  )}

                  {c.type === 'switch' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold' }}>State:</label>
                      <button
                        type="button"
                        className="literal-switch"
                        style={{ 
                          height: '28px', 
                          width: '80px', 
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: c.state === 'closed' ? 'rgba(21, 94, 239, 0.1)' : 'var(--surface-soft)', 
                          color: c.state === 'closed' ? 'var(--primary)' : 'var(--muted)', 
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          fontWeight: 'bold',
                          clipPath: 'none'
                        }}
                        onClick={() => onUpdateComponentValue(c.id, 'state', c.state === 'closed' ? 'open' : 'closed')}
                      >
                        {c.state === 'closed' ? 'Closed' : 'Open'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Button */}
      {canContinue ? (
        <button
          onClick={() => onViewChange('simulate')}
          className="blue-button"
          style={{ height: '54px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--success)' }}
        >
          ✓ Looks good, continue
        </button>
      ) : (
        <button
          disabled
          className="literal-switch"
          style={{ height: '54px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-soft)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'not-allowed' }}
        >
          Please resolve circuit warnings to continue
        </button>
      )}
    </div>
  </main>
}
