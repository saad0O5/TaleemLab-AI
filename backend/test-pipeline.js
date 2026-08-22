require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { callVisionModel } = require("./lib/visionModel");
const { RECOGNITION_PROMPT, parseCircuitRecognitionResponse } = require("./lib/prompts");
const { solveCircuit } = require("./lib/circuitSolver");

const TEST_IMAGES_DIR = path.join(__dirname, "test-images");

// Supported image extensions
const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"]);

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

/**
 * Run the recognition and solver pipeline for a single image file
 */
async function processImage(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n======================================================`);
  console.log(`Processing: ${fileName}`);
  console.log(`======================================================`);

  try {
    // Read file and convert to base64 data URI
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    const base64Data = fileBuffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    console.log(`[1/3] Calling Vision Model with prompt...`);
    const rawResponse = await callVisionModel(dataUri, RECOGNITION_PROMPT);

    console.log(`[2/3] Parsing model response...`);
    const parsedResult = parseCircuitRecognitionResponse(rawResponse);

    if (!parsedResult.success) {
      console.error(`❌ Recognition parsing failed!`);
      console.error(`Raw output from model:\n${parsedResult.raw}`);
      return;
    }

    console.log(`\n--- Recognized Circuit JSON ---`);
    console.log(JSON.stringify(parsedResult.data, null, 2));

    console.log(`\n[3/3] Running Circuit Solver...`);
    const solveResult = solveCircuit(parsedResult.data);

    console.log(`\n--- Solver Output ---`);
    console.log(JSON.stringify(solveResult, null, 2));
    console.log(`\n✅ Finished processing ${fileName}`);
  } catch (err) {
    console.error(`\n❌ Error processing ${fileName}:`, err.message);
  }
}

async function main() {
  console.log("======================================================");
  console.log("      TaleemLab End-to-End Test Pipeline            ");
  console.log("======================================================");

  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
    console.log(`\nCreated directory: ${TEST_IMAGES_DIR}`);
  }

  const files = fs.readdirSync(TEST_IMAGES_DIR).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return VALID_EXTENSIONS.has(ext);
  });

  if (files.length === 0) {
    console.log(`\nNo test images found in './test-images/'.`);
    console.log(`Please place 2-3 circuit diagram photos (.jpg, .png, etc.) inside:`);
    console.log(`  ${TEST_IMAGES_DIR}`);
    console.log(`\nThen run:`);
    console.log(`  node test-pipeline.js`);
    return;
  }

  console.log(`Found ${files.length} image(s) in './test-images/':`);
  files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));

  for (const file of files) {
    const fullPath = path.join(TEST_IMAGES_DIR, file);
    await processImage(fullPath);
  }

  console.log(`\n======================================================`);
  console.log("All test images processed.");
  console.log("======================================================\n");
}

main().catch(err => {
  console.error("Fatal error running test pipeline:", err);
  process.exit(1);
});
