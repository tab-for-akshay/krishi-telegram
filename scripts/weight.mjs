/**
 * scripts/weight.mjs
 * Sums the bytes of all landing-page assets (index.html, app.js, styles.css)
 * raw and gzip-compressed, then writes site/weight.json.
 *
 * Run: node scripts/weight.mjs
 * (kvk.json is excluded — it loads only on demand, not on page load)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(__dirname, '..', 'site');

const ASSETS = ['index.html', 'app.js', 'styles.css'];

let totalRaw = 0;
let totalGzip = 0;
const breakdown = [];

for (const name of ASSETS) {
  const path = join(siteDir, name);
  const raw = readFileSync(path);
  const gz = gzipSync(raw, { level: 9 });
  totalRaw += raw.length;
  totalGzip += gz.length;
  breakdown.push({
    asset: name,
    raw_bytes: raw.length,
    gzip_bytes: gz.length,
  });
  console.log(`  ${name}: ${raw.length} B raw, ${gz.length} B gzip`);
}

const gzip_kb = Math.ceil(totalGzip / 1024);

const result = {
  assets: breakdown,
  total_raw_bytes: totalRaw,
  total_gzip_bytes: totalGzip,
  gzip_kb,
  generated: new Date().toISOString(),
};

const outPath = join(siteDir, 'weight.json');
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');

console.log(`\nTotal: ${totalRaw} B raw / ${totalGzip} B gzip → ${gzip_kb} KB`);
console.log(`Written: site/weight.json`);
