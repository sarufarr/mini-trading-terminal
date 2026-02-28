#!/usr/bin/env node
/**
 * Reads lighthouse-report.json (from npm run lighthouse:ci) and prints
 * a markdown report for README ## Report.
 * Usage: npm run lighthouse:ci && node scripts/lighthouse-report.js
 */
import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), 'lighthouse-report.json');
if (!fs.existsSync(jsonPath)) {
  console.log(
    'No lighthouse-report.json found. Run: npm run build && npm run preview, then in another terminal: npm run lighthouse:ci'
  );
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const categories = data.categories || {};
const audits = data.audits || {};

const perf = categories.performance;
const score = perf ? Math.round((perf.score || 0) * 100) : null;

function metric(name, auditKey, formatter = (v) => v) {
  const a = audits[auditKey];
  if (!a || a.numericValue == null) return null;
  return {
    name,
    value: formatter(a.numericValue),
    displayValue: a.displayValue,
  };
}

const fcp = metric('First Contentful Paint', 'first-contentful-paint', (v) =>
  (v / 1000).toFixed(2)
);
const lcp = metric(
  'Largest Contentful Paint',
  'largest-contentful-paint',
  (v) => (v / 1000).toFixed(2)
);
const tbt = metric('Total Blocking Time', 'total-blocking-time', (v) =>
  Math.round(v)
);
const cls = metric('Cumulative Layout Shift', 'cumulative-layout-shift', (v) =>
  v.toFixed(3)
);
const si = metric('Speed Index', 'speed-index', (v) => (v / 1000).toFixed(2));
const ttfb = metric('Time to First Byte', 'server-response-time', (v) =>
  (v / 1000).toFixed(2)
);

const lines = [
  '### Performance audit',
  '',
  '| Metric | Value |',
  '|--------|------|',
  score != null ? `| **Performance score** | **${score}** / 100 |` : '',
  fcp
    ? `| First Contentful Paint | ${fcp.displayValue || fcp.value + ' s'} |`
    : '',
  lcp
    ? `| Largest Contentful Paint | ${lcp.displayValue || lcp.value + ' s'} |`
    : '',
  tbt
    ? `| Total Blocking Time | ${tbt.displayValue || tbt.value + ' ms'} |`
    : '',
  cls ? `| Cumulative Layout Shift | ${cls.displayValue || cls.value} |` : '',
  si ? `| Speed Index | ${si.displayValue || si.value + ' s'} |` : '',
  ttfb
    ? `| Time to First Byte | ${ttfb.displayValue || ttfb.value + ' s'} |`
    : '',
  '',
  `*Generated from \`lighthouse-report.json\` (run \`npm run lighthouse:ci\` after \`npm run preview\`).*`,
  '',
].filter(Boolean);

console.log(lines.join('\n'));
