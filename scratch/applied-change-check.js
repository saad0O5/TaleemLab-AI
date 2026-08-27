// Quick verification that /api/text-command returns appliedChange
(async () => {
  const circuit = {
    topology: 'series', parallel_groups: [],
    components: [
      { id: 'battery_1', type: 'battery', voltage: 9, polarity: 'same', connects_to: ['resistor_1'] },
      { id: 'resistor_1', type: 'resistor', resistance: 470, connects_to: ['switch_1'] },
      { id: 'switch_1', type: 'switch', state: 'closed', connects_to: ['battery_1'] },
    ],
  };
  for (const text of ['open switch', 'increase resistance to 200', 'make it brighter']) {
    const res = await fetch('http://localhost:4000/api/text-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circuit, text }),
    });
    const json = await res.json();
    console.log(`\n"${text}" =>`, JSON.stringify({
      recognized: json.recognized,
      appliedChange: json.appliedChange,
      current: json.current,
      explanation: json.explanation,
    }));
  }
})();
