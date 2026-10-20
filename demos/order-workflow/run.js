'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { processOrders } = require('./engine.js');
try {
  const inputPath = process.argv[2] || path.join(__dirname, 'sample-orders.json');
  if (fs.statSync(inputPath).size > 250000) throw new Error('Use an input file under 250 KB.');
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
  process.stdout.write(JSON.stringify(processOrders(input), null, 2) + '\n');
} catch (error) {
  process.stderr.write(`Cannot process orders: ${error instanceof SyntaxError ? 'Input must contain valid JSON.' : error.message}\n`);
  process.exitCode = 1;
}
