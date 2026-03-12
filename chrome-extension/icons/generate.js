// Run: node generate.js  (requires node-canvas: npm install canvas)
// This generates icon16.png, icon48.png, icon128.png in the icons/ directory.
// If node-canvas isn't available, open ../make-icons.html in a browser instead.

import { createCanvas } from "canvas";
import { writeFileSync } from "fs";

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const s = size;

  // Background
  const bg = ctx.createRadialGradient(s * 0.4, s * 0.35, 0, s * 0.5, s * 0.5, s * 0.7);
  bg.addColorStop(0, "#1a2840");
  bg.addColorStop(1, "#0b0f14");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, s, s, s * 0.22);
  ctx.fill();

  // Lightning bolt
  ctx.fillStyle = "#6ee7ff";
  ctx.shadowColor = "#6ee7ff";
  ctx.shadowBlur = s * 0.12;

  const top = s * 0.12;
  const mid = s * 0.50;
  const bot = s * 0.88;
  const left = s * 0.22;
  const right = s * 0.78;
  const cx = s * 0.5;

  ctx.beginPath();
  ctx.moveTo(cx + s * 0.10, top);
  ctx.lineTo(left, mid + s * 0.04);
  ctx.lineTo(cx - s * 0.06, mid + s * 0.04);
  ctx.lineTo(cx - s * 0.10, bot);
  ctx.lineTo(right, mid - s * 0.04);
  ctx.lineTo(cx + s * 0.06, mid - s * 0.04);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer("image/png");
}

for (const size of [16, 48, 128]) {
  writeFileSync(`icon${size}.png`, drawIcon(size));
  console.log(`Created icon${size}.png`);
}
