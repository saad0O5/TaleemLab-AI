'use client'

import { useState, useMemo } from 'react'

/**
 * Compact RC time slider — only shown when a capacitor is in the circuit.
 * Shows how current decays and capacitor voltage rises over time.
 */
export function CapacitorPanel({
  tau,               // time constant in seconds (R × C)
  sourceVoltage,     // battery voltage
  totalResistance,   // total resistance in ohms
  closed,            // whether switch is closed
}: {
  tau: number
  sourceVoltage: number
  totalResistance: number
  closed: boolean
}) {
  const [time, setTime] = useState(0)

  // Charging curve: Vc(t) = V * (1 - e^(-t/τ)), I(t) = (V/R) * e^(-t/τ)
  const { vc, ic, chargePercent } = useMemo(() => {
    if (!closed || tau <= 0) {
      return { vc: 0, ic: 0, chargePercent: 0 }
    }
    const t = time * tau // convert slider units to actual seconds
    const decay = Math.exp(-t / tau)
    const vc = sourceVoltage * (1 - decay)
    const ic = (sourceVoltage / totalResistance) * decay
    const chargePercent = (1 - decay) * 100
    return { vc, ic, chargePercent }
  }, [time, tau, sourceVoltage, totalResistance, closed])

  // 5τ is essentially "fully charged" (~99.3%)
  const maxSliderUnits = 5

  return (
    <div className="capacitor-panel">
      <div className="capacitor-header">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="2" x2="5" y2="14" />
          <line x1="11" y1="2" x2="11" y2="14" />
        </svg>
        <span>Capacitor</span>
        <span className="capacitor-tau">τ = {tau.toFixed(3)}s</span>
      </div>

      {/* Charge bar */}
      <div className="capacitor-charge-bar">
        <div
          className="capacitor-charge-fill"
          style={{ width: `${chargePercent}%` }}
        />
      </div>
      <div className="capacitor-charge-label">
        {chargePercent.toFixed(0)}% charged — {vc.toFixed(2)}V across capacitor
      </div>

      {/* Time slider */}
      <label className="capacitor-time-label">
        Time: {(time * tau).toFixed(2)}s
        <input
          type="range"
          min={0}
          max={maxSliderUnits}
          step={0.05}
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          disabled={!closed}
        />
      </label>

      {/* Live values */}
      <div className="capacitor-values">
        <div>
          <span className="cap-val-label">Current</span>
          <span className="cap-val-number">{closed ? ic.toFixed(4) : '0.0000'} A</span>
        </div>
        <div>
          <span className="cap-val-label">V across</span>
          <span className="cap-val-number">{closed ? vc.toFixed(2) : '0.00'} V</span>
        </div>
      </div>

      {!closed && (
        <p className="capacitor-hint">Close the switch to charge the capacitor</p>
      )}
    </div>
  )
}
