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

async function runTest() {
  console.log('Testing: "set resistance to -100"');
  const res = await postJSON(`${API_URL}/api/text-command`, {
    circuit: testCircuit,
    text: 'set resistance to -100'
  });
  console.log('Response:', JSON.stringify(res.data, null, 2));
}

runTest().catch(console.error);
