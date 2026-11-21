/**
 * Generate every app image from the brand vectors — one source of truth.
 *
 * Edit the SVGs in assets/brand/ and run `node scripts/build-assets.mjs`; all
 * the icons and the splash regenerate at pixel-perfect quality. Uses sharp
 * (a dev dependency) which rasterises SVG via librsvg.
 *
 *   Logo.svg    the mark (two cards)      -> icon, adaptive foreground, monochrome
 *   Logo-1.svg  mark + wordmark lockup    -> splash
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../assets/brand');
const OUT = resolve(__dirname, '../assets');

const CANVAS = 1024;
const BRAND = { r: 0x8d, g: 0xb3, b: 0x55, alpha: 1 }; // #8DB355 brand green
const DEEP = '#5C8A2E'; // deeper green — legible logo on the light splash
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Load an SVG, optionally recolouring its white fills. */
function svg(name, fill) {
  let s = readFileSync(resolve(SRC, name), 'utf8');
  if (fill) s = s.replaceAll('fill="white"', `fill="${fill}"`);
  return Buffer.from(s);
}

/** Rasterise an SVG crisply to fit inside a box×box square, transparent around it. */
function render(svgBuffer, box) {
  return sharp(svgBuffer, { density: 512 })
    .resize({ width: box, height: box, fit: 'contain', background: CLEAR })
    .png()
    .toBuffer();
}

/** Centre a rendered mark on a 1024 canvas of the given background. */
async function compose(innerBuffer, background, outFile) {
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background } })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toFile(resolve(OUT, outFile));
  console.log(`  ${outFile}`);
}

console.log('Generating assets from assets/brand/ …');

// App icon — white mark on the brand green, glyph ~53% of the full square tile
// (iOS + legacy Android show the whole square, so this reads well padded).
await compose(await render(svg('Logo.svg'), 544), BRAND, 'icon.png');

// Android adaptive foreground — Android masks to a circle/squircle and zooms into
// the centre ~66% "safe zone", so the mark must stay small on the 1024 canvas or
// it balloons and touches the edges. 440/1024 ≈ 43% leaves comfortable room
// inside the mask.
await compose(await render(svg('Logo.svg'), 440), CLEAR, 'android-icon-foreground.png');

// Android monochrome (themed icon) — black silhouette on transparent, same size.
await compose(await render(svg('Logo.svg', 'black'), 440), CLEAR, 'android-icon-monochrome.png');

// Splash — the deeper-green lockup (mark + wordmark) on the off-white splash bg
// set in app.json. Larger (820/1024 ≈ 80%) so it reads as a proper hero, and the
// deeper green keeps the wordmark crisp on light instead of faint.
await compose(await render(svg('Logo-1.svg', DEEP), 820), CLEAR, 'splash-icon.png');

// Web favicon, from the finished icon.
await sharp(resolve(OUT, 'icon.png')).resize(48, 48).png().toFile(resolve(OUT, 'favicon.png'));
console.log('  favicon.png');

console.log('Done.');
