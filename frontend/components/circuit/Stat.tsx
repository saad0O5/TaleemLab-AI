export function Stat({ label, value, unit, warning, color }: { label: string; value: string; unit?: string; warning?: boolean; color?: string }) {
  return (
    <div
      className={`stat-card ${warning ? 'stat-warning' : ''}`}
      style={color && !warning ? { '--stat-accent': color } as React.CSSProperties : undefined}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {unit && <small>{unit}</small>}
    </div>
  )
}
