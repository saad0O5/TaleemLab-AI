/**
 * Single source of truth for the decorative accent colors used by the
 * circuit diagram and the live stat cards. These are intentionally
 * saturated so they stay legible on both light and dark surfaces, and
 * they are shared between the SVG renderer and the Stat cards so the
 * same component type always reads as the same color across the app.
 */

/** Accent color per circuit component type (used by CircuitDiagram + SetupScreen badges). */
export const TYPE_COLORS: Record<string, string> = {
  battery: '#dc2626',
  resistor: '#d97706',
  switch: '#2563eb',
  bulb: '#eab308',
  ammeter: '#7c3aed',
  voltmeter: '#059669',
  capacitor: '#ec4899',
  diode: '#06b6d4',
}

/** Accent color per lab-bench stat card. */
export const STAT_COLORS = {
  voltage: TYPE_COLORS.battery,   // red  — the "push"
  resistance: TYPE_COLORS.resistor, // amber — the "restriction"
  current: '#0d9488',             // teal — the "flow"
  brightness: TYPE_COLORS.bulb,   // yellow — light output
} as const
