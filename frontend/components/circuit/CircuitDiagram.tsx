import { CircuitComponent, CircuitData, ComponentState } from '../../lib/types'

interface CircuitDiagramProps {
  circuit: CircuitData | null
  componentStates: ComponentState[]
  closed: boolean
  current: number
}

const RECT = { x1: 100, y1: 70, x2: 460, y2: 230 }
const LOOP_W = RECT.x2 - RECT.x1
const LOOP_H = RECT.y2 - RECT.y1
const PERIMETER = 2 * (LOOP_W + LOOP_H)

type Edge = 'top' | 'right' | 'bottom' | 'left'
type LayoutUnit =
  | { kind: 'single'; component: CircuitComponent }
  | { kind: 'group'; components: CircuitComponent[] }

// Point on the rectangular loop at a given distance from the top-left corner (clockwise)
function pointAt(distance: number): { x: number; y: number; edge: Edge } {
  const t = ((distance % PERIMETER) + PERIMETER) % PERIMETER
  if (t < LOOP_W) return { x: RECT.x1 + t, y: RECT.y1, edge: 'top' }
  if (t < LOOP_W + LOOP_H) return { x: RECT.x2, y: RECT.y1 + (t - LOOP_W), edge: 'right' }
  if (t < LOOP_W + LOOP_H + LOOP_W) return { x: RECT.x2 - (t - LOOP_W - LOOP_H), y: RECT.y2, edge: 'bottom' }
  return { x: RECT.x1, y: RECT.y2 - (t - LOOP_W - LOOP_H - LOOP_W), edge: 'left' }
}

// One slot per series element; parallel-group members share a single slot
function layoutUnits(circuit: CircuitData): LayoutUnit[] {
  if (circuit.topology !== 'series_parallel' || !circuit.parallel_groups || circuit.parallel_groups.length === 0) {
    return circuit.components.map((component) => ({ kind: 'single', component }))
  }
  const byId = new Map(circuit.components.map((c) => [c.id, c]))
  const groupOf = new Map<string, number>()
  circuit.parallel_groups.forEach((group, index) => group.forEach((id) => groupOf.set(id, index)))

  const units: LayoutUnit[] = []
  const placedGroups = new Set<number>()
  for (const component of circuit.components) {
    const groupIndex = groupOf.get(component.id)
    if (groupIndex === undefined) {
      units.push({ kind: 'single', component })
      continue
    }
    if (placedGroups.has(groupIndex)) continue
    placedGroups.add(groupIndex)
    const members = circuit.parallel_groups[groupIndex]
      .map((id) => byId.get(id))
      .filter((c): c is CircuitComponent => Boolean(c))
    if (members.length > 1) units.push({ kind: 'group', components: members })
    else units.push({ kind: 'single', component: members[0] ?? component })
  }
  return units
}

function valueLabel(component: CircuitComponent): string {
  if (component.type === 'battery' && component.voltage !== undefined) return `${component.voltage} V`
  if ((component.type === 'resistor' || component.type === 'bulb') && component.resistance !== undefined) return `${component.resistance} Ω`
  if (component.type === 'switch') return component.state === 'closed' ? 'closed' : 'open'
  return ''
}

// Same glyph paths as the Icon component (24x24 space)
function Glyph({ component, bulbStyle }: { component: CircuitComponent; bulbStyle?: React.CSSProperties }) {
  switch (component.type) {
    case 'battery':
      return <path d="M6 8v8M18 5v14M3 11v2M21 10v4M6 12h12" />
    case 'resistor':
      return <path d="M3 12h4l2-4 3 8 3-8 2 4h4" />
    case 'switch':
      return <>
        <path d={component.state === 'closed' ? 'M3 12h6m6 0h6M9 12l6 0' : 'M3 12h6m6 0h6M9 12l5-5'} />
        <circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" />
      </>
    case 'bulb':
      return <><circle cx="12" cy="10" r="6" style={bulbStyle} /><path d="M9 16h6M10 20h4" /></>
    default:
      return <path d="m5 12 4 4L19 6" />
  }
}

function DiagramNode({ component, x, y, size, edge, state, sideLabels }: {
  component: CircuitComponent
  x: number
  y: number
  size: number
  edge: Edge
  state?: ComponentState
  sideLabels?: boolean
}) {
  const brightness = component.type === 'bulb' ? Math.round((state?.brightness ?? 0) * 100) : 0
  const bulbStyle: React.CSSProperties | undefined = component.type === 'bulb'
    ? { fill: `color-mix(in srgb, var(--teal) ${brightness}%, var(--surface))`, filter: brightness ? 'drop-shadow(0 0 9px var(--teal))' : 'none' }
    : undefined
  const value = valueLabel(component)
  const off = size / 2

  let anchor: 'middle' | 'start' | 'end'
  let idPos: { x: number; y: number }
  let valuePos: { x: number; y: number }
  if (sideLabels) {
    const flip = edge === 'right'
    anchor = flip ? 'end' : 'start'
    const lx = (off + 8) * (flip ? -1 : 1)
    idPos = { x: lx, y: 3 }
    valuePos = { x: lx, y: 14 }
  } else if (edge === 'top') {
    anchor = 'middle'; idPos = { x: 0, y: -(off + 16) }; valuePos = { x: 0, y: -(off + 5) }
  } else if (edge === 'bottom') {
    anchor = 'middle'; idPos = { x: 0, y: off + 13 }; valuePos = { x: 0, y: off + 24 }
  } else if (edge === 'right') {
    anchor = 'end'; idPos = { x: -(off + 8), y: 3 }; valuePos = { x: -(off + 8), y: 14 }
  } else {
    anchor = 'start'; idPos = { x: off + 8, y: 3 }; valuePos = { x: off + 8, y: 14 }
  }

  return <g className={`node node-${component.type}`} transform={`translate(${x} ${y})`}>
    <g transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 24})`} strokeWidth={3 * 24 / size}>
      <Glyph component={component} bulbStyle={bulbStyle} />
    </g>
    <text x={idPos.x} y={idPos.y} textAnchor={anchor}>{component.id}</text>
    {value && <text x={valuePos.x} y={valuePos.y} textAnchor={anchor}>{value}</text>}
  </g>
}

// Parallel group: members stacked between two visible junction points
function GroupNode({ components, x, y, size, edge, states }: {
  components: CircuitComponent[]
  x: number
  y: number
  size: number
  edge: Edge
  states: ComponentState[]
}) {
  const k = components.length
  const gap = Math.min(size + 18, (LOOP_H - 24) / k)
  const halfSpan = ((k - 1) / 2) * gap
  const junctionTop = -halfSpan - gap / 2
  const junctionBottom = halfSpan + gap / 2

  return <g className="node" transform={`translate(${x} ${y})`}>
    <line x1="0" y1={junctionTop} x2="0" y2={junctionBottom} />
    <circle cx="0" cy={junctionTop} r="3.5" style={{ fill: 'var(--primary)', stroke: 'none' }} />
    <circle cx="0" cy={junctionBottom} r="3.5" style={{ fill: 'var(--primary)', stroke: 'none' }} />
    {components.map((component, i) => (
      <DiagramNode
        key={component.id}
        component={component}
        x={0}
        y={(i - (k - 1) / 2) * gap}
        size={size}
        edge={edge}
        state={states.find((s) => s.id === component.id)}
        sideLabels
      />
    ))}
  </g>
}

export function CircuitDiagram({ circuit, componentStates, closed, current }: CircuitDiagramProps) {
  const units = circuit ? layoutUnits(circuit) : []
  const n = units.length
  const size = n > 6 ? Math.max(22, Math.round(44 * 6 / n)) : 44

  return <div className={`sim-diagram ${closed ? 'is-flowing' : ''}`} style={{ '--pulse-speed': `${Math.max(.18, 2.8 - current * 12)}s` } as React.CSSProperties}>
    <svg viewBox="0 0 560 300" role="img" aria-label="Interactive rectangular circuit diagram">
      <path className="circuit-wire" d={`M${RECT.x1} ${RECT.y1}H${RECT.x2}V${RECT.y2}H${RECT.x1}V${RECT.y1}`} />
      {units.map((unit, i) => {
        const { x, y, edge } = pointAt(PERIMETER * (i + 0.5) / n)
        if (unit.kind === 'single') {
          return <DiagramNode
            key={unit.component.id}
            component={unit.component}
            x={x} y={y} size={size} edge={edge}
            state={componentStates.find((s) => s.id === unit.component.id)}
          />
        }
        return <GroupNode
          key={`parallel-group-${i}`}
          components={unit.components}
          x={x} y={y} size={size} edge={edge}
          states={componentStates}
        />
      })}
      {n === 0 && <text x="280" y="155" textAnchor="middle" fill="var(--muted)" fontSize="12">No components detected</text>}
    </svg>
    <div className="diagram-caption"><span className="flow-key" /> {closed ? 'Current is flowing through the circuit' : 'Open switch — no current flow'}</div>
  </div>
}
