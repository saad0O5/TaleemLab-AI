const { solveCircuit } = require('../backend/lib/circuitSolver');

// Test: ideal_zero_resistance_example from exampleCircuits.ts
const idealExample = {
  topology: 'series',
  parallel_groups: [],
  components: [
    { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['bulb_1'] },
    { id: 'bulb_1', type: 'bulb', resistance: 5, connects_to: ['battery_1'] },
  ]
};
console.log('=== ideal_zero_resistance_example (resistance=5) ===');
const r1 = solveCircuit(idealExample);
console.log('flags:', JSON.stringify(r1.flags));
console.log('Has ideal_zero_resistance flag:', r1.flags.includes('ideal_zero_resistance'));
console.log('totalResistance:', r1.totalResistance);

// Test: what resistance triggers the flag?
const zeroExample = {
  topology: 'series',
  parallel_groups: [],
  components: [
    { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['bulb_1'] },
    { id: 'bulb_1', type: 'bulb', resistance: 0, connects_to: ['battery_1'] },
  ]
};
console.log('\n=== zero resistance example (resistance=0) ===');
const r2 = solveCircuit(zeroExample);
console.log('flags:', JSON.stringify(r2.flags));
console.log('Has ideal_zero_resistance flag:', r2.flags.includes('ideal_zero_resistance'));
console.log('totalResistance:', r2.totalResistance);

// Test: voltmeter in series topology (test 10 from solver tests)
const voltmeterExample = {
  topology: 'series',
  parallel_groups: [['resistor_1', 'voltmeter_1']],
  components: [
    { id: 'battery_1', type: 'battery', voltage: 9, connects_to: ['resistor_1'] },
    { id: 'resistor_1', type: 'resistor', resistance: 100, connects_to: ['battery_1'] },
    { id: 'voltmeter_1', type: 'voltmeter', connects_to: ['resistor_1'] }
  ]
};
console.log('\n=== voltmeter example (topology=series with parallel_groups) ===');
const r3 = solveCircuit(voltmeterExample);
console.log('resistor_1 state:', JSON.stringify(r3.componentStates.find(s => s.id === 'resistor_1')));
console.log('voltmeter_1 state:', JSON.stringify(r3.componentStates.find(s => s.id === 'voltmeter_1')));
console.log('totalResistance:', r3.totalResistance);
console.log('current:', r3.current);
console.log('NOTE: resistor_1 current=0 and voltage=0 indicates parallel group is ignored in series topology path');
