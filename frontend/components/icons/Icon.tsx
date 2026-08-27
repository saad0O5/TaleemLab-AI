export function Icon({ type, size = 20 }: { type: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (type === 'battery') return <svg {...p}><path d="M6 8v8M18 5v14M3 11v2M21 10v4M6 12h12" /></svg>
  if (type === 'resistor') return <svg {...p}><path d="M3 12h4l2-4 3 8 3-8 2 4h4" /></svg>
  if (type === 'switch') return <svg {...p}><path d="M3 12h6m6 0h6M9 12l5-5" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /></svg>
  if (type === 'bulb') return <svg {...p}><circle cx="12" cy="10" r="6" /><path d="M9 16h6M10 20h4" /></svg>
  if (type === 'sun') return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5m12 12L20 20M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
  return <svg {...p}><path d="m5 12 4 4L19 6" /></svg>
}
