export function Icon({ type, size = 20 }: { type: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (type === 'battery') return <svg {...p}><path d="M6 8v8M18 5v14M3 11v2M21 10v4M6 12h12" /></svg>
  if (type === 'resistor') return <svg {...p}><path d="M3 12h4l2-4 3 8 3-8 2 4h4" /></svg>
  if (type === 'switch') return <svg {...p}><path d="M3 12h6m6 0h6M9 12l5-5" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /></svg>
  if (type === 'bulb') return <svg {...p}><circle cx="12" cy="10" r="6" /><path d="M9 16h6M10 20h4" /></svg>
  if (type === 'flask') return <svg {...p}><path d="M9 3h6M10 3v6.5L4 18.5a1 1 0 0 0 .87 1.5h14.26a1 1 0 0 0 .87-1.5L14 9.5V3" /><path d="M8 14h8" /></svg>
  if (type === 'camera') return <svg {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
  if (type === 'upload') return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
  if (type === 'arrow-up') return <svg {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  if (type === 'arrow-down') return <svg {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
  if (type === 'equals') return <svg {...p}><path d="M5 9h14M5 15h14" /></svg>
  if (type === 'sun') return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5m12 12L20 20M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
  if (type === 'moon') return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" /></svg>
  if (type === 'arrow-left') return <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
  if (type === 'users') return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  if (type === 'sparkles') return <svg {...p}><path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3Z" /><path d="M19 15l-.75 2.25L16 18l2.25.75L19 21l.75-2.25L22 18l-2.25-.75L19 15Z" /></svg>
  if (type === 'brain') return <svg {...p}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" /></svg>
  if (type === 'undo') return <svg {...p}><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
  if (type === 'user') return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
  if (type === 'check') return <svg {...p}><path d="m5 12 4 4L19 6" /></svg>
  if (type === 'alert') return <svg {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  if (type === 'x') return <svg {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
  if (type === 'chevron-down') return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>
  if (type === 'chevron-up') return <svg {...p}><path d="m18 15-6-6-6 6" /></svg>
  if (type === 'lightbulb') return <svg {...p}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
  if (type === 'trophy') return <svg {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
  if (type === 'target') return <svg {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
  return <svg {...p}><path d="m5 12 4 4L19 6" /></svg>
}
