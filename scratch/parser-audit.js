const { parseCommand } = require('../backend/lib/textCommandParser');

const circuit = {
  topology: 'series',
  parallel_groups: [],
  components: [
    { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
    { id: 'resistor_1', type: 'resistor', resistance: 100, connects_to: ['battery_1', 'switch_1'] },
    { id: 'switch_1', type: 'switch', state: 'open', connects_to: ['resistor_1'] },
  ]
};

const tests = [
  // Documented patterns
  ['set resistance to 200',        true,  'resistance', 200],
  ['set resistance to 2.2k',       true,  'resistance', 2200],
  ['increase resistance to 500',   true,  'resistance', 500],
  ['decrease resistance to 50',    true,  'resistance', 50],
  ['set voltage to 12',            true,  'voltage', 12],
  ['increase voltage to 24',       true,  'voltage', 24],
  ['decrease voltage to 3',        true,  'voltage', 3],
  ['open switch',                  true,  'state', 'open'],
  ['close switch',                 true,  'state', 'closed'],
  ['turn off switch',              true,  'state', 'open'],
  ['turn on switch',               true,  'state', 'closed'],
  // Negative numbers (recent addition)
  ['set resistance to -50',        true,  'resistance', -50],
  ['set voltage to -10',           true,  'voltage', -10],
  // Genuinely unrecognized input
  ['hello world',                  false],
  ['what is physics',              false],
  ['',                             false],
  ['do nothing',                   false],
  // Edge cases
  ['change the resistance to 1k',  true,  'resistance', 1000],
  ['adjust voltage to 5V',         true,  'voltage', 5],
];

let pass = 0, fail = 0;
for (const [text, shouldRecognize, expectedField, expectedValue] of tests) {
  const result = parseCommand(text, circuit);
  const recognized = result.recognized !== false;
  
  if (recognized !== shouldRecognize) {
    console.log(`FAIL: "${text}" — expected recognized=${shouldRecognize}, got ${recognized}`);
    fail++;
    continue;
  }
  
  if (shouldRecognize) {
    if (result.field !== expectedField) {
      console.log(`FAIL: "${text}" — expected field=${expectedField}, got ${result.field}`);
      fail++;
      continue;
    }
    if (result.newValue !== expectedValue) {
      console.log(`FAIL: "${text}" — expected newValue=${expectedValue}, got ${result.newValue}`);
      fail++;
      continue;
    }
  }
  
  console.log(`PASS: "${text}"`);
  pass++;
}

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
