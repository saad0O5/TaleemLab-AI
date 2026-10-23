import { useState } from 'react'
import { CircuitComponent, CircuitData, ComponentState } from '../../lib/types'
import { TYPE_COLORS } from '../../lib/colors'

interface CircuitDiagramProps {
  circuit: CircuitData | null
  componentStates: ComponentState[]
  closed: boolean
  current: number
  voltage?: number
}

/* ─── Geometry ─── */
const RECT = { x1: 100, y1: 70, x2: 460, y2: 240 }
const LOOP_W = RECT.x2 - RECT.x1
const LOOP_H = RECT.y2 - RECT.y1
const PERIMETER = 2 * (LOOP_W + LOOP_H)

type Edge = 'top' | 'right' | 'bottom' | 'left'
type LayoutUnit =
  | { kind: 'single'; component: CircuitComponent }
  | { kind: 'group'; components: CircuitComponent[] }

function pointAt(distance: number): { x: number; y: number; edge: Edge } {
  const t = ((distance % PERIMETER) + PERIMETER) % PERIMETER
  if (t < LOOP_W) return { x: RECT.x1 + t, y: RECT.y1, edge: 'top' }
  if (t < LOOP_W + LOOP_H) return { x: RECT.x2, y: RECT.y1 + (t - LOOP_W), edge: 'right' }
  if (t < LOOP_W + LOOP_H + LOOP_W) return { x: RECT.x2 - (t - LOOP_W - LOOP_H), y: RECT.y2, edge: 'bottom' }
  return { x: RECT.x1, y: RECT.y2 - (t - LOOP_W - LOOP_H - LOOP_W), edge: 'left' }
}

function layoutUnits(circuit: CircuitData): LayoutUnit[] {
  if (circuit.topology !== 'series_parallel' || !circuit.parallel_groups?.length) {
    return circuit.components.map((c) => ({ kind: 'single', component: c }))
  }
  const byId = new Map(circuit.components.map((c) => [c.id, c]))
  const groupOf = new Map<string, number>()
  circuit.parallel_groups.forEach((g, i) => g.forEach((id) => groupOf.set(id, i)))
  const units: LayoutUnit[] = []
  const placed = new Set<number>()
  for (const component of circuit.components) {
    const gi = groupOf.get(component.id)
    if (gi === undefined) { units.push({ kind: 'single', component }); continue }
    if (placed.has(gi)) continue
    placed.add(gi)
    const members = circuit.parallel_groups[gi].map((id) => byId.get(id)).filter((c): c is CircuitComponent => !!c)
    units.push(members.length > 1 ? { kind: 'group', components: members } : { kind: 'single', component: members[0] ?? component })
  }
  return units
}

function sortUnits(units: LayoutUnit[]): LayoutUnit[] {
  const batteries = units.filter((u) => (u.kind === 'single' ? u.component.type : u.components[0]?.type) === 'battery')
  const others = units.filter((u) => (u.kind === 'single' ? u.component.type : u.components[0]?.type) !== 'battery')
  return [...batteries, ...others]
}

function valueLabel(c: CircuitComponent): string {
  if (c.type === 'battery' && c.voltage !== undefined) return `${c.voltage} V`
  if ((c.type === 'resistor' || c.type === 'bulb') && c.resistance !== undefined) return `${c.resistance} Ω`
  if (c.type === 'switch') return c.state === 'closed' ? 'CLOSED' : 'OPEN'
  if (c.type === 'capacitor' && c.capacitance !== undefined) return `${c.capacitance} μF`
  if (c.type === 'diode') return '0.7V drop'
  return ''
}

function edgeRotation(edge: Edge): number {
  return edge === 'top' ? 0 : edge === 'right' ? 90 : edge === 'bottom' ? 180 : 270
}

/* ─── PhET-Style Component Symbols (Lifelike & Schematic) ─── */

function BatterySymbol({ s, lifelike }: { s: number; lifelike: boolean }) {
  if (lifelike) {
    return (
      <g>
        <line x1={-20 * s} y1={0} x2={-14 * s} y2={0} stroke="#475569" strokeWidth={2.5} />
        {/* AA Battery Body */}
        <rect x={-14 * s} y={-10 * s} width={28 * s} height={20 * s} rx={2.5 * s} fill="#1E293B" stroke="#0F172A" strokeWidth={1} />
        {/* Golden copper collar */}
        <rect x={-14 * s} y={-10 * s} width={8 * s} height={20 * s} rx={2 * s} fill="#D97706" />
        {/* Positive terminal nipple */}
        <rect x={-17 * s} y={-4 * s} width={3.5 * s} height={8 * s} rx={1} fill="#94A3B8" />
        <text x={-10 * s} y={4 * s} fontSize={9 * s} fontWeight="900" fill="#FFFFFF" textAnchor="middle" stroke="none">+</text>
        <text x={7 * s} y={4 * s} fontSize={9 * s} fontWeight="900" fill="#94A3B8" textAnchor="middle" stroke="none">−</text>
        <line x1={14 * s} y1={0} x2={20 * s} y2={0} stroke="#475569" strokeWidth={2.5} />
      </g>
    )
  }

  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-5 * s} y2={0} />
      <line x1={-5 * s} y1={-14 * s} x2={-5 * s} y2={14 * s} strokeWidth={2.5} />
      <line x1={5 * s} y1={-8 * s} x2={5 * s} y2={8 * s} strokeWidth={4} />
      <line x1={5 * s} y1={0} x2={20 * s} y2={0} />
      <text x={-11 * s} y={-16 * s} textAnchor="middle" fontSize={12 * s} fontWeight="800" fill={TYPE_COLORS.battery} stroke="none">+</text>
      <text x={11 * s} y={-16 * s} textAnchor="middle" fontSize={12 * s} fontWeight="800" fill={TYPE_COLORS.battery} stroke="none">−</text>
    </g>
  )
}

function ResistorSymbol({ s, lifelike }: { s: number; lifelike: boolean }) {
  if (lifelike) {
    return (
      <g>
        <line x1={-20 * s} y1={0} x2={-12 * s} y2={0} stroke="#64748B" strokeWidth={2.5} />
        {/* Ceramic body */}
        <rect x={-12 * s} y={-7 * s} width={24 * s} height={14 * s} rx={5 * s} fill="#E2E8F0" stroke="#94A3B8" strokeWidth={1} />
        {/* Color bands: Brown, Black, Red, Gold */}
        <rect x={-8 * s} y={-7 * s} width={2.5 * s} height={14 * s} fill="#78350F" />
        <rect x={-3 * s} y={-7 * s} width={2.5 * s} height={14 * s} fill="#000000" />
        <rect x={2 * s} y={-7 * s} width={2.5 * s} height={14 * s} fill="#DC2626" />
        <rect x={7 * s} y={-7 * s} width={2 * s} height={14 * s} fill="#EAB308" />
        <line x1={12 * s} y1={0} x2={20 * s} y2={0} stroke="#64748B" strokeWidth={2.5} />
      </g>
    )
  }

  const w = 16 * s, h = 8 * s
  const d = `M${-20 * s},0 H${-w} L${-w + 3 * s},${-h} L${-w + 7 * s},${h} L${-w + 11 * s},${-h} L${-w + 15 * s},${h} L${-w + 19 * s},${-h} L${-w + 23 * s},${h} L${w},0 H${20 * s}`
  return <path d={d} strokeLinejoin="round" />
}

function SwitchSymbol({ s, closed }: { s: number; closed: boolean }) {
  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-8 * s} y2={0} />
      <circle cx={-8 * s} cy={0} r={2.5 * s} fill="currentColor" stroke="none" />
      <circle cx={8 * s} cy={0} r={2.5 * s} fill="currentColor" stroke="none" />
      <line
        x1={-8 * s} y1={0}
        x2={closed ? 8 * s : 6 * s}
        y2={closed ? 0 : -14 * s}
        strokeWidth={3}
      />
      <line x1={8 * s} y1={0} x2={20 * s} y2={0} />
    </g>
  )
}

function BulbSymbol({ s, brightness, lifelike }: { s: number; brightness: number; lifelike: boolean }) {
  const r = 10 * s
  const rayLen = 8 * s + brightness * 16 * s
  const rayAlpha = Math.min(0.9, 0.2 + brightness * 0.7)

  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-r} y2={0} />

      {/* PhET Radiant Glow Rays when lit */}
      {brightness > 0.05 && (
        <g stroke="#EAB308" strokeWidth={2 * s} strokeLinecap="round" opacity={rayAlpha}>
          {/* 8 Radial Light Rays */}
          <line x1={0} y1={-r - 2} x2={0} y2={-r - rayLen} />
          <line x1={0} y1={r + 2} x2={0} y2={r + rayLen} />
          <line x1={-r - 2} y1={0} x2={-r - rayLen} y2={0} />
          <line x1={r + 2} y1={0} x2={r + rayLen} y2={0} />
          <line x1={-r * 0.7} y1={-r * 0.7} x2={(-r - rayLen) * 0.7} y2={(-r - rayLen) * 0.7} />
          <line x1={r * 0.7} y1={-r * 0.7} x2={(r + rayLen) * 0.7} y2={(-r - rayLen) * 0.7} />
          <line x1={-r * 0.7} y1={r * 0.7} x2={(-r - rayLen) * 0.7} y2={(r + rayLen) * 0.7} />
          <line x1={r * 0.7} y1={r * 0.7} x2={(r + rayLen) * 0.7} y2={(r + rayLen) * 0.7} />
        </g>
      )}

      {/* Outer ambient glow halo */}
      {brightness > 0 && (
        <circle cx={0} cy={0} r={r + 10 * s} fill={`rgba(250, 204, 21, ${brightness * 0.35})`} stroke="none" />
      )}

      {/* Glass Bulb Dome */}
      <circle
        cx={0} cy={0} r={r}
        fill={brightness > 0 ? `rgba(254, 240, 138, ${0.4 + brightness * 0.5})` : (lifelike ? 'rgba(241, 245, 249, 0.6)' : 'none')}
        stroke={lifelike ? '#E2E8F0' : 'currentColor'}
        strokeWidth={2.5}
      />

      {/* Internal Filament */}
      <path
        d={`M${-4 * s},${3 * s} L${-2 * s},${-4 * s} L${0},${-2 * s} L${2 * s},${-4 * s} L${4 * s},${3 * s}`}
        fill="none"
        stroke={brightness > 0 ? '#F59E0B' : '#94A3B8'}
        strokeWidth={2}
      />

      <line x1={r} y1={0} x2={20 * s} y2={0} />
    </g>
  )
}

function MeterSymbol({ s, label }: { s: number; label: string }) {
  const r = 11 * s
  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-r} y2={0} />
      <circle cx={0} cy={0} r={r} fill="none" strokeWidth={2} />
      <text x={0} y={4 * s} textAnchor="middle" fontSize={11 * s} fontWeight="800" stroke="none" fill="currentColor">
        {label}
      </text>
      <line x1={r} y1={0} x2={20 * s} y2={0} />
    </g>
  )
}

function CapacitorSymbol({ s }: { s: number }) {
  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-3 * s} y2={0} />
      <line x1={-3 * s} y1={-10 * s} x2={-3 * s} y2={10 * s} strokeWidth={2.5} />
      <line x1={3 * s} y1={-10 * s} x2={3 * s} y2={10 * s} strokeWidth={2.5} />
      <line x1={3 * s} y1={0} x2={20 * s} y2={0} />
    </g>
  )
}

function DiodeSymbol({ s }: { s: number }) {
  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-6 * s} y2={0} />
      <polygon points={`${-6 * s},${-8 * s} ${-6 * s},${8 * s} ${6 * s},0`} fill="currentColor" stroke="none" />
      <line x1={6 * s} y1={-8 * s} x2={6 * s} y2={8 * s} strokeWidth={2.5} />
      <line x1={6 * s} y1={0} x2={20 * s} y2={0} />
    </g>
  )
}

function renderSymbol(type: string, s: number, switchClosed: boolean, brightness: number, lifelike: boolean) {
  switch (type) {
    case 'battery': return <BatterySymbol s={s} lifelike={lifelike} />
    case 'resistor': return <ResistorSymbol s={s} lifelike={lifelike} />
    case 'switch': return <SwitchSymbol s={s} closed={switchClosed} />
    case 'bulb': return <BulbSymbol s={s} brightness={brightness} lifelike={lifelike} />
    case 'ammeter': return <MeterSymbol s={s} label="A" />
    case 'voltmeter': return <MeterSymbol s={s} label="V" />
    case 'capacitor': return <CapacitorSymbol s={s} />
    case 'diode': return <DiodeSymbol s={s} />
    default: return <path d={`M${-12 * s},${-12 * s} L${12 * s},${12 * s} M${12 * s},${-12 * s} L${-12 * s},${12 * s}`} />
  }
}

function DiagramNode({ component, x, y, size, edge, state, sideLabels, onHover, lifelike }: {
  component: CircuitComponent; x: number; y: number; size: number
  edge: Edge; state?: ComponentState; sideLabels?: boolean; lifelike: boolean
  onHover?: (comp: CircuitComponent, state: ComponentState | undefined, x: number, y: number) => void
}) {
  const color = TYPE_COLORS[component.type] || 'var(--primary)'
  const brightness = component.type === 'bulb' ? (state?.brightness ?? 0) : 0
  const value = valueLabel(component)
  const rot = edgeRotation(edge)
  const s = size / 42

  let idPos: { x: number; y: number }
  let valPos: { x: number; y: number }
  let anchor: 'middle' | 'start' | 'end'

  if (sideLabels) {
    const flip = edge === 'right'
    anchor = flip ? 'end' : 'start'
    const lx = (size / 2 + 12) * (flip ? -1 : 1)
    idPos = { x: lx, y: -3 }
    valPos = { x: lx, y: 11 }
  } else if (edge === 'top') {
    anchor = 'middle'; idPos = { x: 0, y: -(size / 2 + 18) }; valPos = { x: 0, y: -(size / 2 + 6) }
  } else if (edge === 'bottom') {
    anchor = 'middle'; idPos = { x: 0, y: size / 2 + 14 }; valPos = { x: 0, y: size / 2 + 26 }
  } else if (edge === 'right') {
    anchor = 'end'; idPos = { x: -(size / 2 + 10), y: -2 }; valPos = { x: -(size / 2 + 10), y: 12 }
  } else {
    anchor = 'start'; idPos = { x: size / 2 + 10, y: -2 }; valPos = { x: size / 2 + 10, y: 12 }
  }

  return (
    <g transform={`translate(${x} ${y})`}
      onMouseEnter={() => onHover?.(component, state, x, y)}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={0} cy={0} r={size / 2 + 6} fill="var(--surface)" stroke="none" />

      <g
        transform={`rotate(${rot})`}
        style={{
          color,
          fill: 'none',
          stroke: color,
          strokeWidth: 2.5,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
        }}
      >
        {renderSymbol(component.type, s, component.state === 'closed', brightness, lifelike)}
      </g>

      <text x={idPos.x} y={idPos.y} textAnchor={anchor} fontSize="11" fontWeight="700" fill="var(--foreground)" stroke="none">
        {component.id.replace(/_/g, ' ')}
      </text>

      {value && (
        <text x={valPos.x} y={valPos.y} textAnchor={anchor} fontSize="10" fontWeight="600" fill={color} stroke="none" opacity="0.85">
          {value}
        </text>
      )}
    </g>
  )
}

function GroupNode({ components, x, y, size, edge, states, lifelike }: {
  components: CircuitComponent[]; x: number; y: number
  size: number; edge: Edge; states: ComponentState[]; lifelike: boolean
}) {
  const k = components.length
  const gap = Math.min(size + 22, (LOOP_H - 30) / k)
  const halfSpan = ((k - 1) / 2) * gap
  const jTop = -halfSpan - gap / 2
  const jBot = halfSpan + gap / 2

  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={0} y1={jTop} x2={0} y2={jBot} stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={0} cy={jTop} r={4} fill="var(--primary)" stroke="none" />
      <circle cx={0} cy={jBot} r={4} fill="var(--primary)" stroke="none" />
      {components.map((component, i) => (
        <DiagramNode
          key={component.id}
          component={component}
          x={0}
          y={(i - (k - 1) / 2) * gap}
          size={size}
          edge={edge}
          state={states.find((st) => st.id === component.id)}
          sideLabels
          lifelike={lifelike}
        />
      ))}
    </g>
  )
}

function perimeterDist(p: { x: number; y: number; edge: Edge }): number {
  switch (p.edge) {
    case 'top': return p.x - RECT.x1
    case 'right': return LOOP_W + (p.y - RECT.y1)
    case 'bottom': return LOOP_W + LOOP_H + (RECT.x2 - p.x)
    case 'left': return 2 * LOOP_W + LOOP_H + (RECT.y2 - p.y)
  }
}

function buildWireSegments(positions: { x: number; y: number; edge: Edge }[], gapSize: number): string[] {
  const n = positions.length
  if (n === 0) return [`M${RECT.x1} ${RECT.y1}H${RECT.x2}V${RECT.y2}H${RECT.x1}V${RECT.y1}`]

  const halfGap = gapSize / 2
  const segments: string[] = []
  const corners = [0, LOOP_W, LOOP_W + LOOP_H, 2 * LOOP_W + LOOP_H, PERIMETER]

  for (let i = 0; i < n; i++) {
    const fromDist = perimeterDist(positions[i]) + halfGap
    const toDist = perimeterDist(positions[(i + 1) % n]) - halfGap
    let endDist = toDist
    if (endDist <= fromDist) endDist += PERIMETER

    const pts: string[] = []
    let d = fromDist
    const sp = pointAt(d)
    pts.push(`M${sp.x} ${sp.y}`)

    while (d < endDist) {
      const next = corners.find((c) => c > (d % PERIMETER)) ?? PERIMETER
      const nextD = d + ((next - (d % PERIMETER)) % PERIMETER || PERIMETER)
      if (nextD <= endDist) {
        const cp = pointAt(nextD)
        pts.push(`L${cp.x} ${cp.y}`)
        d = nextD
      } else break
    }

    const ep = pointAt(endDist % PERIMETER)
    pts.push(`L${ep.x} ${ep.y}`)
    segments.push(pts.join(''))
  }

  return segments
}

/* ─── Main Component ─── */

export function CircuitDiagram({ circuit, componentStates, closed, current, voltage = 9 }: CircuitDiagramProps) {
  const [lifelike, setLifelike] = useState(true)
  const [showMultimeter, setShowMultimeter] = useState(false)
  const [showElectrons, setShowElectrons] = useState(true)

  const rawUnits = circuit ? layoutUnits(circuit) : []
  const units = sortUnits(rawUnits)
  const n = units.length
  const size = n > 6 ? Math.max(26, Math.round(48 * 6 / n)) : 48
  const gapForWire = size + 18
  const positions = units.map((_, i) => pointAt(PERIMETER * (i + 0.5) / n))
  const wireSegments = n > 0
    ? buildWireSegments(positions, gapForWire)
    : [`M${RECT.x1} ${RECT.y1}H${RECT.x2}V${RECT.y2}H${RECT.x1}V${RECT.y1}`]

  const [tooltip, setTooltip] = useState<{
    comp: CircuitComponent; state: ComponentState | undefined; x: number; y: number
  } | null>(null)

  function handleHover(comp: CircuitComponent, state: ComponentState | undefined, x: number, y: number) {
    setTooltip({ comp, state, x, y })
  }

  // 12 PhET Electron particle offsets
  const electronOffsets = Array.from({ length: 12 }, (_, i) => i / 12)
  const animDuration = Math.max(0.6, 3.2 - Math.min(2.5, Math.sqrt(current) * 1.3))

  return (
    <div
      className={`sim-diagram ${closed ? 'is-flowing' : ''}`}
      style={{ '--pulse-speed': `${Math.max(0.2, 2.5 - Math.sqrt(current) * 1.05)}s` } as React.CSSProperties}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* PhET Control Bar */}
      <div className="phet-toolbar">
        <div className="phet-mode-toggles">
          <button
            className={`phet-pill-btn ${lifelike ? 'active' : ''}`}
            onClick={() => setLifelike(true)}
            type="button"
          >
            🎨 Lifelike View
          </button>
          <button
            className={`phet-pill-btn ${!lifelike ? 'active' : ''}`}
            onClick={() => setLifelike(false)}
            type="button"
          >
            📐 Schematic
          </button>
        </div>

        <div className="phet-tool-actions">
          <button
            className={`phet-tool-btn ${showElectrons ? 'active' : ''}`}
            onClick={() => setShowElectrons(!showElectrons)}
            type="button"
            title="Toggle PhET Electron Flow"
          >
            🔵 Electrons {showElectrons ? 'ON' : 'OFF'}
          </button>

          <button
            className={`phet-tool-btn ${showMultimeter ? 'active' : ''}`}
            onClick={() => setShowMultimeter(!showMultimeter)}
            type="button"
            title="Toggle Voltmeter"
          >
            📟 Multimeter
          </button>
        </div>
      </div>

      <svg viewBox="0 0 560 310" role="img" aria-label="Circuit diagram">
        {/* Subtle background */}
        <rect x="2" y="2" width="556" height="306" rx="12" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="1" opacity="0.6" />

        {/* Wire paths */}
        <defs>
          <path id="wire-loop" d={wireSegments.join(' ')} />
          <filter id="phetGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Copper Wires */}
        {wireSegments.map((d, i) => (
          <path
            key={i}
            className="circuit-wire"
            d={d}
            stroke={lifelike ? '#B45309' : 'currentColor'}
            strokeWidth={lifelike ? 4 : 2.5}
          />
        ))}

        {/* Junction dots */}
        {positions.map((p, i) => {
          const halfGap = gapForWire / 2
          const dist = perimeterDist(p)
          const before = pointAt(((dist - halfGap) + PERIMETER) % PERIMETER)
          const after = pointAt((dist + halfGap) % PERIMETER)
          return (
            <g key={`dots-${i}`}>
              <circle cx={before.x} cy={before.y} r={lifelike ? 4 : 3.5} fill={lifelike ? '#D97706' : 'var(--primary)'} stroke="none" />
              <circle cx={after.x} cy={after.y} r={lifelike ? 4 : 3.5} fill={lifelike ? '#D97706' : 'var(--primary)'} stroke="none" />
            </g>
          )
        })}

        {/* PhET Moving Blue Electrons */}
        {showElectrons && closed && current > 0 && electronOffsets.map((offset, i) => (
          <g key={`electron-${i}`}>
            <circle r="4.5" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" filter="url(#phetGlow)">
              <animateMotion
                dur={`${animDuration}s`}
                repeatCount="indefinite"
                begin={`${offset * animDuration}s`}
              >
                <mpath href="#wire-loop" />
              </animateMotion>
            </circle>
          </g>
        ))}

        {/* Components */}
        {units.map((unit, i) => {
          const { x, y, edge } = positions[i]
          if (unit.kind === 'single') {
            return (
              <DiagramNode
                key={unit.component.id}
                component={unit.component}
                x={x} y={y} size={size} edge={edge}
                state={componentStates.find((s) => s.id === unit.component.id)}
                onHover={handleHover}
                lifelike={lifelike}
              />
            )
          }
          return (
            <GroupNode
              key={`parallel-group-${i}`}
              components={unit.components}
              x={x} y={y} size={size} edge={edge}
              states={componentStates}
              lifelike={lifelike}
            />
          )
        })}

        {/* PhET Digital Multimeter overlay */}
        {showMultimeter && (
          <g transform="translate(380, 25)" className="phet-multimeter-overlay">
            {/* Multimeter body */}
            <rect x="0" y="0" width="155" height="95" rx="8" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
            <rect x="6" y="6" width="143" height="42" rx="4" fill="#0F172A" />
            {/* Digital Readout */}
            <text x="18" y="26" fill="#38BDF8" fontSize="11" fontFamily="monospace" fontWeight="800">
              V: {closed ? (voltage).toFixed(2) : '0.00'} V
            </text>
            <text x="18" y="42" fill="#4ADE80" fontSize="11" fontFamily="monospace" fontWeight="800">
              I: {closed ? (current).toFixed(3) : '0.000'} A
            </text>
            {/* Probes indicator */}
            <circle cx="35" cy="72" r="7" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1.5" />
            <text x="35" y="75" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle">+</text>
            <circle cx="120" cy="72" r="7" fill="#1E293B" stroke="#000000" strokeWidth="1.5" />
            <text x="120" y="75" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle">−</text>
            <text x="78" y="86" fill="#78350F" fontSize="8" fontWeight="700" textAnchor="middle">DIGITAL MULTIMETER</text>
          </g>
        )}

        {/* Empty state */}
        {n === 0 && (
          <text x="280" y="160" textAnchor="middle" fill="var(--muted)" fontSize="13" fontWeight="600" stroke="none">
            No components detected
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="circuit-tooltip"
          style={{
            left: `${(tooltip.x / 560) * 100}%`,
            top: `${(tooltip.y / 310) * 100}%`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="tt-type" style={{ color: TYPE_COLORS[tooltip.comp.type] || 'var(--primary)' }}>
            {tooltip.comp.type}
          </div>
          {tooltip.comp.voltage !== undefined && (
            <div className="tt-row">
              <span className="tt-label">Voltage</span>
              <span className="tt-value">{tooltip.comp.voltage} V</span>
            </div>
          )}
          {tooltip.comp.resistance !== undefined && (
            <div className="tt-row">
              <span className="tt-label">Resistance</span>
              <span className="tt-value">{tooltip.comp.resistance} {'\u03A9'}</span>
            </div>
          )}
          {tooltip.state?.current !== null && tooltip.state?.current !== undefined && (
            <div className="tt-row">
              <span className="tt-label">Current</span>
              <span className="tt-value">{tooltip.state.current.toFixed(3)} A</span>
            </div>
          )}
          {tooltip.comp.type === 'bulb' && tooltip.state?.brightness !== null && (
            <div className="tt-row">
              <span className="tt-label">Brightness</span>
              <span className="tt-value">{Math.round((tooltip.state?.brightness ?? 0) * 100)}%</span>
            </div>
          )}
        </div>
      )}

      <div className="diagram-caption">
        <span className="flow-key" />
        {closed
          ? `Current: ${current.toFixed(3)} A — Electrons flowing dynamically`
          : 'Switch OPEN — Circuit broken (0.000 A)'}
      </div>
    </div>
  )
}
