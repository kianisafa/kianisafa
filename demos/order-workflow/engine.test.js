'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { processOrders } = require('./engine.js');
const samples = require('./sample-orders.json');
const clean = () => structuredClone(samples[0]);
test('mixed input produces one ready, three held and one waiting', () => {
  assert.deepEqual(processOrders(samples).summary, { total:5, ready:1, review:3, waiting:1 });
});
test('missing payment reference cannot reach handoff', () => {
  const order = clean(); delete order.paymentReference;
  const result = processOrders([order]).orders[0];
  assert.equal(result.state, 'review_required');
  assert(result.issues.some(i => i.code === 'payment_reference_required'));
});
test('normalized duplicate IDs hold every copy without choosing a winner', () => {
  const a = clean(), b = clean(); b.id = ' demo-101 ';
  assert(processOrders([a,b]).orders.every(o => o.state === 'review_required' && o.issues.some(i => i.code === 'duplicate_id')));
});
test('delivery requires a city, pickup does not', () => {
  const order = clean(); delete order.city;
  assert.equal(processOrders([order]).summary.review,1);
  order.fulfilment = 'pickup'; assert.equal(processOrders([order]).summary.ready,1);
});
test('pending payment remains held even if a reference is present', () => {
  const order = clean(); order.paymentStatus = 'pending';
  assert.equal(processOrders([order]).orders[0].state,'awaiting_payment');
});
test('malformed records and invalid quantities never silently pass', () => {
  for (const quantity of [0,-1,1.5,'2',null,Infinity,NaN]) {
    const order = clean(); order.items[0].quantity = quantity;
    assert.equal(processOrders([order]).summary.review,1);
  }
  assert.equal(processOrders([null,42,'order',[],{}]).summary.review,5);
});
test('unknown payment states are explicitly reviewed', () => {
  const order = clean(); order.paymentStatus = 'refunded';
  assert.equal(processOrders([order]).summary.review,1);
});
test('invalid contact, empty items and missing fulfilment produce actionable issues', () => {
  const order=clean(); order.contactEmail='missing'; order.items=[]; delete order.fulfilment;
  assert.deepEqual(processOrders([order]).orders[0].issues.map(i=>i.code),['contact_required','items_invalid','fulfilment_required']);
});
test('output excludes customer contact, payment references and arbitrary source fields', () => {
  const order = clean(); order.notes='PRIVATE-NOTE';
  const output = JSON.stringify(processOrders([order]));
  for(const secret of [order.contactEmail, order.paymentReference, order.city, 'PRIVATE-NOTE']) assert(!output.includes(secret));
});
test('repeated runs are deterministic and do not mutate input', () => {
  const before=JSON.stringify(samples), first=processOrders(samples);
  assert.deepEqual(first,processOrders(samples)); assert.equal(JSON.stringify(samples),before);
});
test('top-level validation rejects invalid input and caps batch size', () => {
  assert.throws(()=>processOrders({}),/array/); assert.throws(()=>processOrders(Array(501).fill(null)),/500/);
  assert.deepEqual(processOrders([]).summary,{total:0,ready:0,review:0,waiting:0});
});
test('invalid IDs are replaced by record labels rather than reflected in output', () => {
  const order=clean(); order.id='<img src=x onerror=alert(1)>';
  const output=processOrders([order]); assert.equal(output.orders[0].orderId,'RECORD-001');
  assert(!JSON.stringify(output).includes('<img'));
});
test('CLI runs bundled sample independently of working directory', () => {
  const result=spawnSync(process.execPath,[path.join(__dirname,'run.js')],{encoding:'utf8'});
  assert.equal(result.status,0); assert.equal(JSON.parse(result.stdout).summary.total,5);
});
test('browser bundle uses the exact same tested engine', () => {
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/\r\n/g,'\n');
  const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8').replace(/\r\n/g,'\n');
  assert(html.includes(engine)); assert(!/\b(fetch|XMLHttpRequest|WebSocket|localStorage)\s*[.(]/.test(html));
});
