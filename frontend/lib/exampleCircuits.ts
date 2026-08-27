import { CircuitData } from './types'

export type ExampleKey = 'clean_circuit' | 'battery_polarity_unset_example' | 'no_battery_example' | 'incomplete_circuit_example' | 'value_out_of_range_example' | 'ideal_zero_resistance_example'

export const exampleLabels: Record<ExampleKey, string> = {
  clean_circuit: 'Clean circuit',
  battery_polarity_unset_example: 'Battery polarity unset',
  no_battery_example: 'No battery',
  incomplete_circuit_example: 'Incomplete circuit',
  value_out_of_range_example: 'Value out of range',
  ideal_zero_resistance_example: 'Ideal zero resistance',
}

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
