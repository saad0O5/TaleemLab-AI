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
  console.log('=== FIX 5: Explanations with Actual Values Tests ===\n');

  // Test 1: Resistance increase
  console.log('Test 1: Resistance increase explanation');
  const res1 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'resistor_1',
    field: 'resistance',
    newValue: 250
  });
  console.log(`  Explanation: ${res1.data.explanation}`);
  console.log(`  ✓ Contains values: ${res1.data.explanation.includes('100') && res1.data.explanation.includes('250')}\n`);

  // Test 2: Resistance decrease
  console.log('Test 2: Resistance decrease explanation');
  const res2 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'resistor_1',
    field: 'resistance',
    newValue: 50
  });
  console.log(`  Explanation: ${res2.data.explanation}`);
  console.log(`  ✓ Contains values: ${res2.data.explanation.includes('100') && res2.data.explanation.includes('50')}\n`);

  // Test 3: Voltage increase
  console.log('Test 3: Voltage increase explanation');
  const res3 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'battery_1',
    field: 'voltage',
    newValue: 12
  });
  console.log(`  Explanation: ${res3.data.explanation}`);
  console.log(`  ✓ Contains values: ${res3.data.explanation.includes('9') && res3.data.explanation.includes('12')}\n`);

  // Test 4: Voltage decrease
  console.log('Test 4: Voltage decrease explanation');
  const res4 = await postJSON(`${API_URL}/api/apply-change`, {
    circuit: testCircuit,
    componentId: 'battery_1',
    field: 'voltage',
    newValue: 5
  });
  console.log(`  Explanation: ${res4.data.explanation}`);
  console.log(`  ✓ Contains values: ${res4.data.explanation.includes('9') && res4.data.explanation.includes('5')}\n`);

  console.log('=== All FIX 5 tests completed ===');
}

runTests().catch(console.error);
