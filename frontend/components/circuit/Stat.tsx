export function Stat({ label, value, unit, warning }: { label: string; value: string; unit?: string; warning?: boolean }) {
  return <div className={`stat-card ${warning ? 'stat-warning' : ''}`}><span>{label}</span><strong>{value}</strong>{unit && <small>{unit}</small>}</div>
}
