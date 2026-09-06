import { CircuitData } from './types'

export type ExampleKey = 'clean_circuit' | 'clean_series_parallel_example' | 'rc_circuit_example' | 'diode_circuit_example' | 'battery_polarity_unset_example' | 'no_battery_example' | 'incomplete_circuit_example' | 'value_out_of_range_example' | 'ideal_zero_resistance_example'

export const exampleLabels: Record<ExampleKey, string> = {
  clean_circuit: 'Clean circuit',
  clean_series_parallel_example: 'Series-parallel circuit',
  rc_circuit_example: 'RC circuit',
  diode_circuit_example: 'Diode circuit',
  battery_polarity_unset_example: 'Battery polarity unset',
  no_battery_example: 'No battery',
  incomplete_circuit_example: 'Incomplete circuit',
  value_out_of_range_example: 'Value out of range',
  ideal_zero_resistance_example: 'Ideal zero resistance',
}

/** User-facing curated examples with friendly display names */
export const curatedExamples: { key: ExampleKey; name: string; description: string }[] = [
  { key: 'clean_circuit', name: 'Simple series circuit', description: 'Battery, resistor, switch & bulb in series' },
  { key: 'clean_series_parallel_example', name: 'Series-parallel circuit', description: 'Two resistors in parallel with a series switch' },
  { key: 'rc_circuit_example', name: 'RC charging circuit', description: 'Capacitor charges through a resistor' },
  { key: 'diode_circuit_example', name: 'Diode + LED circuit', description: 'Diode controls current direction' },
]

export const mockCircuitExamples: Record<ExampleKey, CircuitData> = {
  clean_circuit: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'open', connects_to: ['bulb_1'] },
      { id: 'bulb_1', type: 'bulb', resistance: 30, connects_to: ['battery_1'] },
    ],
  },
  // Clean series-parallel: battery + (R1 ∥ R2) + switch — no flags expected
  clean_series_parallel_example: {
    topology: 'series_parallel',
    parallel_groups: [['resistor_1', 'resistor_2']],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1', 'resistor_2'] },
      { id: 'resistor_1', type: 'resistor', resistance: 200, connects_to: ['switch_1'] },
      { id: 'resistor_2', type: 'resistor', resistance: 300, connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'open', connects_to: ['battery_1'] },
    ],
  },
  battery_polarity_unset_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, connects_to: ['battery_2'] },
      { id: 'battery_2', type: 'battery', voltage: 9, connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['battery_1'] },
    ],
  },
  no_battery_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: [] },
    ],
  },
  incomplete_circuit_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: [] },
    ],
  },
  value_out_of_range_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: -10, connects_to: ['battery_1'] },
    ],
  },
  // RC circuit: battery → resistor → capacitor → switch → battery
  rc_circuit_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 1000, connects_to: ['capacitor_1'] },
      { id: 'capacitor_1', type: 'capacitor', capacitance: 100, connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'open', connects_to: ['battery_1'] },
    ],
  },
  // Diode circuit: battery → diode → resistor → bulb → battery
  diode_circuit_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['diode_1'] },
      { id: 'diode_1', type: 'diode', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['bulb_1'] },
      { id: 'bulb_1', type: 'bulb', resistance: 30, connects_to: ['battery_1'] },
    ],
  },
  // Demonstrates the solver's ideal_zero_resistance flag (triggered when total
  // resistance < NEAR_ZERO_THRESHOLD of 0.5Ω in circuitSolver.js). Setting
  // bulb resistance to 0 ensures the backend flag fires directly — not just
  // the frontend's separate ≤25Ω fallback display.
  ideal_zero_resistance_example: {
    topology: 'series',
    parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['bulb_1'] },
      { id: 'bulb_1', type: 'bulb', resistance: 0, connects_to: ['battery_1'] },
    ],
  },
}
