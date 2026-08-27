const http = require('http');

const API_URL = 'http://localhost:4000';

function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const testCircuit = {
  topology: 'series',
  parallel_groups: [],
  components: [
    { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
    { id: 'resistor_1', type: 'resistor', resistance: 100, connects_to: ['battery_1'] }
  ]
};

async function runTests() {
  console.log('=== FIX 1: Bounds Enforcement Tests ===\n');

  // Test 1: Negative resistance
  console.log('Test 1: Negative resistance via /api/apply-change');
  const res1 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'resistor_1',
    field: 'resistance',
    newValue: -50
  });
  console.log(`  Status: ${res1.status}`);
  console.log(`  Error: ${res1.data.error}`);
  console.log(`  Message: ${res1.data.message}`);
  console.log(`  ✓ PASS: ${res1.status === 400 && res1.data.error === 'value_out_of_bounds'}\n`);

  // Test 2: Resistance too high
  console.log('Test 2: Resistance too high via /api/apply-change');
  const res2 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'resistor_1',
    field: 'resistance',
    newValue: 20000
  });
  console.log(`  Status: ${res2.status}`);
  console.log(`  Error: ${res2.data.error}`);
  console.log(`  Message: ${res2.data.message}`);
  console.log(`  ✓ PASS: ${res2.status === 400 && res2.data.error === 'value_out_of_bounds'}\n`);

  // Test 3: Negative voltage
  console.log('Test 3: Negative voltage via /api/apply-change');
  const res3 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'battery_1',
    field: 'voltage',
    newValue: -10
  });
  console.log(`  Status: ${res3.status}`);
  console.log(`  Error: ${res3.data.error}`);
  console.log(`  Message: ${res3.data.message}`);
  console.log(`  ✓ PASS: ${res3.status === 400 && res3.data.error === 'value_out_of_bounds'}\n`);

  // Test 4: Voltage too high
  console.log('Test 4: Voltage too high via /api/apply-change');
  const res4 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'battery_1',
    field: 'voltage',
    newValue: 150
  });
  console.log(`  Status: ${res4.status}`);
  console.log(`  Error: ${res4.data.error}`);
  console.log(`  Message: ${res4.data.message}`);
  console.log(`  ✓ PASS: ${res4.status === 400 && res4.data.error === 'value_out_of_bounds'}\n`);

  // Test 5: Valid resistance (should succeed)
  console.log('Test 5: Valid resistance via /api/apply-change');
  const res5 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'resistor_1',
    field: 'resistance',
    newValue: 500
  });
  console.log(`  Status: ${res5.status}`);
  console.log(`  Has current: ${'current' in res5.data}`);
  console.log(`  ✓ PASS: ${res5.status === 200 && 'current' in res5.data}\n`);

  // Test 6: Text command with negative resistance
  console.log('Test 6: Text command with negative resistance via /api/text-command');
  const res6 = await postJSON(`${API_URL}/api/text-command`, {
    circuit: testCircuit,
    text: 'set resistance to -100'
  });
  console.log(`  Status: ${res6.status}`);
  console.log(`  Error: ${res6.data.error}`);
  console.log(`  Message: ${res6.data.message}`);
  console.log(`  ✓ PASS: ${res6.status === 400 && res6.data.error === 'value_out_of_bounds'}\n`);

  // Test 7: Text command with valid resistance
  console.log('Test 7: Text command with valid resistance via /api/text-command');
  const res7 = await postJSON(`${API_URL}/api/text-command`, {
    circuit: testCircuit,
    text: 'set resistance to 300'
  });
  console.log(`  Status: ${res7.status}`);
  console.log(`  Has appliedChange: ${'appliedChange' in res7.data}`);
  console.log(`  ✓ PASS: ${res7.status === 200 && 'appliedChange' in res7.data}\n`);

  console.log('=== All FIX 1 tests completed ===');
}

runTests().catch(console.error);
