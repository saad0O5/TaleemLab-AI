// Quick API-level probe of backend endpoints (run: node scratch/api-probe.js)
const BASE = 'http://localhost:4000';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const cleanCircuit = {
  topology: 'series',
  parallel_groups: [],
  components: [
    { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
    { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['switch_1'] },
    { id: 'switch_1', type: 'switch', state: 'closed', connects_to: ['bulb_1'] },
    { id: 'bulb_1', type: 'bulb', resistance: 30, connects_to: ['battery_1'] },
  ],
};

(async () => {
  const health = await fetch(`${BASE}/api/health`).then(r => r.json());
  console.log('HEALTH:', JSON.stringify(health));

  const solve = await post('/api/solve-circuit', { circuit: cleanCircuit });
  console.log('\nSOLVE clean circuit (expected I = 9/500 = 0.018A):');
  console.log(JSON.stringify(solve.json, null, 1));

  const openSwitch = await post('/api/apply-change', { circuit: cleanCircuit, componentId: 'switch_1', field: 'state', newValue: 'open' });
  console.log('\nAPPLY-CHANGE open switch (expected current 0):');
  console.log(JSON.stringify({ current: openSwitch.json.current, note: openSwitch.json.note, explanation: openSwitch.json.explanation }));

  const cmd1 = await post('/api/text-command', { circuit: cleanCircuit, text: 'increase resistance to 200' });
  console.log('\nTEXT-CMD "increase resistance to 200":');
  console.log(JSON.stringify({ status: cmd1.status, current: cmd1.json?.current, voltage: cmd1.json?.voltage, explanation: cmd1.json?.explanation, recognized: cmd1.json?.recognized }));

  const cmd2 = await post('/api/text-command', { circuit: cleanCircuit, text: 'open switch' });
  console.log('\nTEXT-CMD "open switch" (backend support check):');
  console.log(JSON.stringify({ status: cmd2.status, current: cmd2.json?.current, note: cmd2.json?.note, recognized: cmd2.json?.recognized }));

  const cmd3 = await post('/api/text-command', { circuit: cleanCircuit, text: 'make it brighter' });
  console.log('\nTEXT-CMD "make it brighter" (expected recognized:false):');
  console.log(JSON.stringify({ status: cmd3.status, body: cmd3.json }));

  const cmd4 = await post('/api/text-command', { circuit: cleanCircuit, text: 'set resistance to 1k' });
  console.log('\nTEXT-CMD "set resistance to 1k" (k-suffix):');
  console.log(JSON.stringify({ status: cmd4.status, recognized: cmd4.json?.recognized }));
})();
