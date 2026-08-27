// Verify solver flags for each example circuit
const { solveCircuit } = require('../backend/lib/circuitSolver.js');

const examples = {
  clean_circuit: {
    topology: 'series', parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'open', connects_to: ['bulb_1'] },
      { id: 'bulb_1', type: 'bulb', resistance: 30, connects_to: ['battery_1'] },
    ],
  },
  battery_polarity_unset_example: {
    topology: 'series', parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, connects_to: ['resistor_1'] },
      { id: 'battery_2', type: 'battery', voltage: 9, connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: [] },
    ],
  },
  no_battery_example: {
    topology: 'series', parallel_groups: [],
    components: [{ id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: [] }],
  },
  incomplete_circuit_example: {
    topology: 'series', parallel_groups: [],
    components: [{ id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: [] }],
  },
  value_out_of_range_example: {
    topology: 'series', parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: -10, connects_to: [] },
    ],
  },
  ideal_zero_resistance_example: {
    topology: 'series', parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['bulb_1'] },
      { id: 'bulb_1', type: 'bulb', resistance: 5, connects_to: ['battery_1'] },
    ],
  },
};

const blockingFlags = ['battery_polarity_unset', 'no_battery_detected', 'incomplete_circuit'];

for (const [name, circuit] of Object.entries(examples)) {
  const result = solveCircuit(circuit);
  const hasBlocking = result.flags.some(f => {
    if (typeof f === 'string') return blockingFlags.includes(f);
    return f.type === 'value_out_of_range';
  });
  console.log(`\n${name}`);
  console.log(`  flags: ${JSON.stringify(result.flags)}`);
  console.log(`  route: ${hasBlocking ? 'CONFIRM' : 'SIMULATE'}`);
  console.log(`  current: ${result.current}A, voltage: ${result.voltage}V`);
}
