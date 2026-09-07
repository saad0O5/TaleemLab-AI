import { useState } from 'react'
import { CircuitComponent, CircuitData, ComponentState } from '../../lib/types'
import { TYPE_COLORS } from '../../lib/colors'

interface CircuitDiagramProps {
  circuit: CircuitData | null
  componentStates: ComponentState[]
  closed: boolean
  current: number
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

/* ─── Colors per component type ─── */
/* TYPE_COLORS is imported from lib/colors (single source of truth). */

/* ─── Helpers ─── */

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

/* ─── SVG Symbols (drawn in horizontal orientation, left→right) ─── */

function BatterySymbol({ s }: { s: number }) {
  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-5 * s} y2={0} />
      <line x1={-5 * s} y1={-14 * s} x2={-5 * s} y2={14 * s} strokeWidth={2.5} />
      <line x1={5 * s} y1={-8 * s} x2={5 * s} y2={8 * s} strokeWidth={4} />
      <line x1={5 * s} y1={0} x2={20 * s} y2={0} />
      {/* Terminal labels: long thin plate = +, short thick plate = − */}
      <text x={-11 * s} y={-16 * s} textAnchor="middle" fontSize={12 * s} fontWeight="800" fill={TYPE_COLORS.battery} stroke="none">
        +
      </text>
      <text x={11 * s} y={-16 * s} textAnchor="middle" fontSize={12 * s} fontWeight="800" fill={TYPE_COLORS.battery} stroke="none">
        −
      </text>
    </g>
  )
}

function ResistorSymbol({ s }: { s: number }) {
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
        y2={closed ? 0 : -12 * s}
        strokeWidth={2.5}
      />
      <line x1={8 * s} y1={0} x2={20 * s} y2={0} />
    </g>
  )
}

function BulbSymbol({ s, brightness }: { s: number; brightness: number }) {
  const r = 10 * s
  return (
    <g>
      <line x1={-20 * s} y1={0} x2={-r} y2={0} />
      {brightness > 0 && (
        <circle cx={0} cy={0} r={r + 5 * s} fill={`rgba(234,179,8,${brightness * 0.15})`} stroke="none" />
      )}
      <circle
        cx={0} cy={0} r={r}
        fill={brightness > 0 ? `rgba(234,179,8,${brightness * 0.25})` : 'none'}
        strokeWidth={2.5}
      />
      <line x1={-r * 0.6} y1={-r * 0.6} x2={r * 0.6} y2={r * 0.6} strokeWidth={2} />
      <line x1={r * 0.6} y1={-r * 0.6} x2={-r * 0.6} y2={r * 0.6} strokeWidth={2} />
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

function renderSymbol(type: string, s: number, switchClosed: boolean, brightness: number) {
  switch (type) {
    case 'battery': return <BatterySymbol s={s} />
    case 'resistor': return <ResistorSymbol s={s} />
    case 'switch': return <SwitchSymbol s={s} closed={switchClosed} />
    case 'bulb': return <BulbSymbol s={s} brightness={brightness} />
    case 'ammeter': return <MeterSymbol s={s} label="A" />
    case 'voltmeter': return <MeterSymbol s={s} label="V" />
    case 'capacitor': return <CapacitorSymbol s={s} />
    case 'diode': return <DiodeSymbol s={s} />
    default: return <path d={`M${-12 * s},${-12 * s} L${12 * s},${12 * s} M${12 * s},${-12 * s} L${-12 * s},${12 * s}`} />
  }
}

/* ─── Diagram Node ─── */

function DiagramNode({ component, x, y, size, edge, state, sideLabels, onHover }: {
  component: CircuitComponent; x: number; y: number; size: number
  edge: Edge; state?: ComponentState; sideLabels?: boolean
  onHover?: (comp: CircuitComponent, state: ComponentState | undefined, x: number, y: number) => void
}) {
  const color = TYPE_COLORS[component.type] || 'var(--primary)'
  const brightness = component.type === 'bulb' ? (state?.brightness ?? 0) : 0
  const value = valueLabel(component)
  const rot = edgeRotation(edge)
  const s = size / 42

  // Label position — always readable, placed away from wires
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
      {/* Mask circle to hide wire behind component */}
      <circle cx={0} cy={0} r={size / 2 + 6} fill="var(--surface)" stroke="none" />

      {/* Colored symbol */}
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
        {renderSymbol(component.type, s, component.state === 'closed', brightness)}
      </g>

      {/* Component ID label */}
      <text x={idPos.x} y={idPos.y} textAnchor={anchor} fontSize="11" fontWeight="700" fill="var(--foreground)" stroke="none">
        {component.id.replace(/_/g, ' ')}
      </text>

      {/* Value label with colored indicator */}
      {value && (
        <text x={valPos.x} y={valPos.y} textAnchor={anchor} fontSize="10" fontWeight="600" fill={color} stroke="none" opacity="0.85">
          {value}
        </text>
      )}
    </g>
  )
}

/* ─── Parallel Group Node ─── */

function GroupNode({ components, x, y, size, edge, states }: {
  components: CircuitComponent[]; x: number; y: number
  size: number; edge: Edge; states: ComponentState[]
}) {
  const k = components.length
  const gap = Math.min(size + 22, (LOOP_H - 30) / k)
  const halfSpan = ((k - 1) / 2) * gap
  const jTop = -halfSpan - gap / 2
  const jBot = halfSpan + gap / 2

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Junction line */}
      <line x1={0} y1={jTop} x2={0} y2={jBot} stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
      {/* Junction dots */}
      <circle cx={0} cy={jTop} r={4} fill="var(--primary)" stroke="none" />
      <circle cx={0} cy={jBot} r={4} fill="var(--primary)" stroke="none" />
      {/* Members */}
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
        />
      ))}
    </g>
  )
}

/* ─── Wire Builder ─── */

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

export function CircuitDiagram({ circuit, componentStates, closed, current }: CircuitDiagramProps) {
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

  return (
    <div
      className={`sim-diagram ${closed ? 'is-flowing' : ''}`}
      style={{ '--pulse-speed': `${Math.max(0.2, 2.5 - Math.sqrt(current) * 1.05)}s` } as React.CSSProperties}
      onMouseLeave={() => setTooltip(null)}
    >
      <svg viewBox="0 0 560 310" role="img" aria-label="Circuit diagram">
        {/* Subtle background */}
        <rect x="2" y="2" width="556" height="306" rx="12" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="1" opacity="0.5" />

        {/* Wire paths */}
        <defs>
          <path id="wire-loop" d={wireSegments.join(' ')} />
        </defs>

        {/* Wires */}
        {wireSegments.map((d, i) => (
          <path key={i} className="circuit-wire" d={d} />
        ))}

        {/* Junction dots at wire-component boundaries */}
        {positions.map((p, i) => {
          const halfGap = gapForWire / 2
          const dist = perimeterDist(p)
          const before = pointAt(((dist - halfGap) + PERIMETER) % PERIMETER)
          const after = pointAt((dist + halfGap) % PERIMETER)
          return (
            <g key={`dots-${i}`}>
              <circle cx={before.x} cy={before.y} r="3.5" className="wire-dot" />
              <circle cx={after.x} cy={after.y} r="3.5" className="wire-dot" />
            </g>
          )
        })}

        {/* Current flow particles (animated dots traveling clockwise) */}
        {closed && current > 0 && [0, 0.33, 0.66].map((offset, i) => (
          <circle key={`particle-${i}`} r="4.5" className="flow-particle">
            <animateMotion
              dur={`${Math.max(0.8, 3 - Math.sqrt(current) * 1.2)}s`}
              repeatCount="indefinite"
              begin={`${offset * Math.max(0.8, 3 - Math.sqrt(current) * 1.2)}s`}
            >
              <mpath href="#wire-loop" />
            </animateMotion>
          </circle>
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
              />
            )
          }
          return (
            <GroupNode
              key={`parallel-group-${i}`}
              components={unit.components}
              x={x} y={y} size={size} edge={edge}
              states={componentStates}
            />
          )
        })}

        {/* Empty state */}
        {n === 0 && (
          <text x="280" y="160" textAnchor="middle" fill="var(--muted)" fontSize="13" fontWeight="600" stroke="none">
            No components detected
          </text>
        )}
      </svg>

      {/* Hover tooltip */}
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
          {tooltip.state?.voltage !== null && tooltip.state?.voltage !== undefined && (
            <div className="tt-row">
              <span className="tt-label">V across</span>
              <span className="tt-value">{tooltip.state.voltage.toFixed(2)} V</span>
            </div>
          )}
          {tooltip.comp.type === 'bulb' && tooltip.state?.brightness !== null && (
            <div className="tt-row">
              <span className="tt-label">Brightness</span>
              <span className="tt-value">{Math.round((tooltip.state?.brightness ?? 0) * 100)}%</span>
            </div>
          )}
          {tooltip.comp.state && (
            <div className="tt-row">
              <span className="tt-label">State</span>
              <span className="tt-value">{tooltip.comp.state}</span>
            </div>
          )}
        </div>
      )}

      <div className="diagram-caption">
        <span className="flow-key" />
        {closed ? 'Current is flowing through the circuit' : 'Open switch — no current flow'}
      </div>
    </div>
  )
}
