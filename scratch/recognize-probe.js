// Probe /api/recognize-circuit with the repo's test images
const fs = require('fs');
const path = require('path');

(async () => {
  for (const name of ['capture1.jpeg', 'capture2.jpeg', 'capture3.jpeg']) {
    const file = path.join(__dirname, '..', 'backend', 'test-images', name);
    const b64 = fs.readFileSync(file).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${b64}`;
    const started = Date.now();
    try {
      const res = await fetch('http://localhost:4000/api/recognize-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const json = await res.json().catch(() => null);
      console.log(`\n=== ${name} (status ${res.status}, ${Date.now() - started}ms) ===`);
      console.log(JSON.stringify(json, null, 1));
    } catch (err) {
      console.log(`\n=== ${name} ERROR: ${err.message}`);
    }
  }
})();
