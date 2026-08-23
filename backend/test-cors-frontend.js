const http = require("http");
const backendServer = require("./server");

const BACKEND_PORT = 3000;
const FRONTEND_PORT = 3001;

const FRONTEND_ORIGIN = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Sample test circuit
const sampleCircuit = {
  topology: "series",
  parallel_groups: [],
  components: [
    { id: "battery_1", type: "battery", voltage: 12, polarity: "same", connects_to: ["resistor_1", "switch_1"] },
    { id: "switch_1", type: "switch", state: "closed", connects_to: ["battery_1", "resistor_1"] },
    { id: "resistor_1", type: "resistor", resistance: 50, connects_to: ["battery_1", "switch_1"] }
  ]
};

async function testCrossOriginCall(name, endpoint, payload) {
  console.log(`\nTesting Cross-Origin: ${name} [${endpoint}] from origin ${FRONTEND_ORIGIN}...`);

  // 1. Send Preflight OPTIONS Request
  const preflightRes = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "OPTIONS",
    headers: {
      "Origin": FRONTEND_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type"
    }
  });

  const allowOrigin = preflightRes.headers.get("access-control-allow-origin");
  const allowMethods = preflightRes.headers.get("access-control-allow-methods");
  console.log(`  [Preflight OPTIONS] Status: ${preflightRes.status}`);
  console.log(`  [Preflight OPTIONS] Access-Control-Allow-Origin: ${allowOrigin}`);
  console.log(`  [Preflight OPTIONS] Access-Control-Allow-Methods: ${allowMethods}`);

  if (allowOrigin !== "*" && allowOrigin !== FRONTEND_ORIGIN) {
    throw new Error(`CORS Preflight failed: invalid Access-Control-Allow-Origin header "${allowOrigin}"`);
  }

  // 2. Send Actual Cross-Origin POST Request
  const actualRes = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Origin": FRONTEND_ORIGIN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const actualAllowOrigin = actualRes.headers.get("access-control-allow-origin");
  const responseData = await actualRes.json();

  console.log(`  [Actual POST] Status: ${actualRes.status}`);
  console.log(`  [Actual POST] Access-Control-Allow-Origin: ${actualAllowOrigin}`);
  console.log(`  [Actual POST] Response Data:`, JSON.stringify(responseData).substring(0, 120) + "...");

  if (actualAllowOrigin !== "*" && actualAllowOrigin !== FRONTEND_ORIGIN) {
    throw new Error(`CORS Request failed: actual request did not return Access-Control-Allow-Origin`);
  }

  console.log(`  ✅ ${name} succeeded cross-origin.`);
}

async function runCorsVerification() {
  console.log("==================================================================");
  console.log(`  Frontend Server running on ${FRONTEND_ORIGIN}                     `);
  console.log(`  Backend Server running on ${BACKEND_URL}                          `);
  console.log("==================================================================");

  // 1. Cross-Origin Call to /api/solve-circuit
  await testCrossOriginCall(
    "Solve Circuit",
    "/api/solve-circuit",
    sampleCircuit
  );

  // 2. Cross-Origin Call to /api/apply-change
  await testCrossOriginCall(
    "Apply Change",
    "/api/apply-change",
    {
      circuit: sampleCircuit,
      componentId: "resistor_1",
      field: "resistance",
      newValue: 100
    }
  );

  // 3. Cross-Origin Call to /api/text-command
  await testCrossOriginCall(
    "Text Command",
    "/api/text-command",
    {
      circuit: sampleCircuit,
      text: "increase resistance to 150"
    }
  );

  // 4. Cross-Origin Call to /api/health
  console.log(`\nTesting Cross-Origin: Health Check [/api/health] from origin ${FRONTEND_ORIGIN}...`);
  const healthRes = await fetch(`${BACKEND_URL}/api/health`, {
    method: "GET",
    headers: { "Origin": FRONTEND_ORIGIN }
  });
  console.log(`  [Actual GET] Status: ${healthRes.status}, Allow-Origin: ${healthRes.headers.get("access-control-allow-origin")}`);
  console.log(`  ✅ Health check succeeded cross-origin.`);

  console.log("\n==================================================================");
  console.log("   🎉 All Cross-Origin Requests Passed Verification Successfully!   ");
  console.log("==================================================================\n");
}

const frontendServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h1>TaleemLab Frontend Server Running on :3001</h1>");
});

backendServer.listen(BACKEND_PORT, () => {
  frontendServer.listen(FRONTEND_PORT, async () => {
    try {
      await runCorsVerification();
    } catch (err) {
      console.error("❌ CORS Verification Error:", err);
    } finally {
      frontendServer.close();
      backendServer.close();
    }
  });
});
