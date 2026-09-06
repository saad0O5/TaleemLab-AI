/**
 * Image compression utility for circuit photo uploads.
 * Resizes and compresses images before sending to the recognition API.
 * Typical reduction: 5-8MB → 200-500KB
 */

const MAX_DIMENSION = 1200; // px
const JPEG_QUALITY = 0.8;

/**
 * Compress a base64 image by resizing and converting to JPEG.
 * Works in browser environments using Canvas API.
 *
 * @param base64 - Base64-encoded image (with or without data URI prefix)
 * @returns Compressed base64 data URI string
 */
export async function compressImage(base64: string): Promise<string> {
  // If we're not in a browser, return as-is (SSR/node fallback)
  if (typeof document === "undefined") return base64;

  // Parse existing data URI or assume JPEG
  let mimeType = "image/jpeg";
  let cleanBase64 = base64;

  if (base64.startsWith("data:")) {
    const matches = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,([\s\S]*)$/);
    if (matches) {
      mimeType = matches[1];
      cleanBase64 = matches[2];
    } else {
      const commaIndex = base64.indexOf(",");
      if (commaIndex !== -1) {
        cleanBase64 = base64.substring(commaIndex + 1);
      }
    }
  }

  // Load image
  const img = await loadImage(cleanBase64, mimeType);

  // Calculate new dimensions (maintain aspect ratio)
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Draw to canvas and export as JPEG
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return base64; // fallback if canvas not supported

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function loadImage(base64: string, mimeType: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}
