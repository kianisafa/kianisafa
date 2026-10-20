'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the standalone interface's events without external packages or network.
function startInterface() {
  class Element {
    constructor() { this.children=[]; this.events={}; this.value=''; this.textContent=''; }
    addEventListener(event, callback) { this.events[event]=callback; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children=children; }
    click() { if(!this.disabled) this.events.click?.(); }
  }
  const ids = new Map(); let exported;
  const document = {
    getElementById(id) { if(!ids.has(id)) ids.set(id,new Element()); return ids.get(id); },
    createElement() { return new Element(); }
  };
  const context = vm.createContext({ document, TextEncoder, Blob,
    URL:{createObjectURL(blob){exported=blob;return 'blob:local-demo';},revokeObjectURL(){}},
    setTimeout(callback){callback();}
  });
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script[1],context);
  return { get:id=>document.getElementById(id), report:()=>exported };
}

test('standalone interface renders the mixed sample and clean-sample controls',()=>{
  const app=startInterface();
  assert.deepEqual(['total','ready','review','waiting'].map(k=>app.get(k).textContent),['5','1','3','1']);
  assert.equal(app.get('review-list').children.length,3);
  app.get('clean').click();
  assert.equal(app.get('ready').textContent,'2');
  assert.equal(app.get('review').textContent,'0');
  app.get('reset').click(); assert.equal(app.get('total').textContent,'5');
});
test('editing input invalidates results and disables exporting a stale report',()=>{
  const app=startInterface(); app.get('input').value='invalid'; app.get('input').events.input();
  assert.equal(app.get('export').disabled,true); assert.equal(app.get('total').textContent,'0');
  app.get('run').click(); assert.match(app.get('status').textContent,/valid JSON/);
  assert.equal(app.get('export').disabled,true);
});
test('empty batches and oversized input have clear outcomes',()=>{
  const app=startInterface(); app.get('input').value='[]'; app.get('run').click();
  assert.equal(app.get('total').textContent,'0'); assert.match(app.get('status').textContent,/Checks complete/);
  app.get('input').value='x'.repeat(250001); app.get('run').click();
  assert.match(app.get('status').textContent,/250 KB/); assert.equal(app.get('export').disabled,true);
});
test('export is a local JSON report without contact data',async()=>{
  const app=startInterface(); app.get('export').click();
  const text=await app.report().text(), report=JSON.parse(text);
  assert.equal(report.summary.total,5); assert.equal(report.orders[1].actions.length,2);
  assert(!text.includes('@')); assert(!text.includes('SYNTHETIC-PAY'));
});
