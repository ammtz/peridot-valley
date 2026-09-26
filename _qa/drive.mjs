// Drive the built app through Edge's DevTools protocol: the opening (wake, three
// questions, hire everyone, tour with the fix, end), then the pre-existing
// re-org/persistence regression checks via the "skip" path. Desktop + phone.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const [W, H, MOBILE] = process.argv[3] === 'phone' ? [390, 844, true] : [1440, 900, false];
const TAG = MOBILE ? 'phone' : 'desktop';
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333',
  '--user-data-dir=' + process.env.TEMP + '/edge-qa-' + Date.now(), 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
const tabs = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = {}; const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value).join(' '));
};
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
const shot = async (name) => writeFileSync(new URL(`${name}${MOBILE ? '-phone' : ''}.png`, import.meta.url), Buffer.from((await cdp('Page.captureScreenshot')).data, 'base64'));
const mouse = (type, x, y) => cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
async function drag(x0, y0, x1, y1) {
  await mouse('mousePressed', x0, y0);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await sleep(30); }
  await mouse('mouseReleased', x1, y1); await sleep(400);
}
async function tap(x, y) { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await sleep(500); }
const feedText = () => js('document.body.innerText');
const clickByText = (name) => js(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(name)});if(!el)return false;el.click();return true;})()`);
const rectOfButton = (name) => js(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(name)});if(!el)return null;const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()`);

await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE });
if (MOBILE) await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
await cdp('Page.navigate', { url: URL_ }); await sleep(2500);
await js("localStorage.removeItem('the-system-live-v4'); location.reload()"); await sleep(2500);

console.log('=== opening walk (' + TAG + ') ===');
console.log('starts on wake screen:', (await feedText()).includes('tap to wake'));
await shot('o1-wake');

await js('window.__sim.wake()');
await sleep(3000); // let the greeting type out
await js('window.__sim.advanceGreet()');
await sleep(3000); // let "Who is this for?" type out
await shot('o2-q1');
console.log('q1 asked:', (await js('window.__sim.speechText')) === 'Who is this for?');
// Real tap on the Q1 answer button, to prove it is actually hittable.
const meRect = await rectOfButton('My work');
console.log('found "My work" button:', !!meRect);
if (meRect) await tap(meRect[0], meRect[1]);
else await js("window.__sim.answerQ1('work')");
await sleep(300);

await js('window.__sim.finishSpeech()');
await js('window.__sim.answerQ2(true)'); await sleep(200);
await js('window.__sim.finishSpeech()');
await js("window.__sim.answerQ3('everything')");
await sleep(3000); // let the first hire card's line type out
await shot('o3-hire-card');
console.log('hire queue length:', await js('window.__sim.hireQueue.length'));

let hired = 0;
for (let guard = 0; guard < 6; guard++) {
  const phase = await js('window.__sim.introPhase');
  if (phase !== 'hiring') break;
  await js('window.__sim.hireCurrent()'); hired++;
  await sleep(300);
}
console.log('managers hired:', hired, '| phase now:', await js('window.__sim.introPhase'));
await js("window.__sim.finishHiring()");
await sleep(3000); // let stop 0's line type out, camera settle
console.log('tour started:', await js('window.__sim.tourOn'));
await shot('o4-tour-stop0');

await js('window.__sim.tourNext()');
await sleep(3000);
console.log('stop1 waiting on the fix:', await js('window.__sim.tourWaiting'));
await shot('o5-tour-stop1');
await js(`(()=>{
  const sim = window.__sim, id = sim.tourBlockedAgentId, a = sim.agent(id);
  if (a) { sim.select({kind:'agent', id}); sim.unblock(a); }
})()`);
await sleep(300);
console.log('stop1 cleared after the fix:', !(await js('window.__sim.tourWaiting')));

await js('window.__sim.tourNext()');
await sleep(3000);
console.log('dock visible at stop2:', (await feedText()).includes('MCP'));
await shot('o6-tour-stop2');
await js("window.__sim.placeFurn('mcp', 400, 500)");
console.log('tool-placed flag set:', await js('window.__sim.tourToolPlaced'));

await js('window.__sim.tourNext()');
await sleep(3000);
await shot('o7-tour-stop3');
await js("window.__sim.placeFurn('rec', 420, 560)");
console.log('recorder-placed flag set:', await js('window.__sim.tourRecPlaced'));

await js('window.__sim.tourNext()');
await sleep(1000);
console.log('onboarded after tour end:', await js('window.__sim.m.onboarded'));
console.log('tourOn after end:', await js('window.__sim.tourOn'));
console.log('dock + feed present at end:', (await feedText()).includes('MCP') && (await feedText()).includes('PIP'));
await shot('o8-end');
const savedOnboarded = await js("JSON.parse(localStorage.getItem('the-system-live-v4')||'null')?.onboarded");
console.log('onboarded persisted to storage:', savedOnboarded);

if (!MOBILE) {
  await js('location.reload()'); await sleep(2500);
  console.log('returning visitor skips the opening:', !(await feedText()).includes('tap to wake'));
  const fps = await js('new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++;performance.now()-t0<2000?requestAnimationFrame(f):r(Math.round(n/2))})()})');
  console.log('fps', fps);

  // --- Regression: "skip" still loads the untouched seed world. ---
  await js("localStorage.removeItem('the-system-live-v4'); location.reload()"); await sleep(2500);
  await js('window.__sim.skipIntro()'); await sleep(500);
  console.log('skip loads the original seed agent count:', await js('window.__sim.m.agents.length'));
  await tap(574, 120); await shot('t1-pip-popup');
  console.log('PIP popup shows NEEDS YOU:', (await feedText()).includes('NEEDS YOU'));
  await js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"); await sleep(300);
  const at = (name, dy = 0) => js(`(()=>{const el=[...document.querySelectorAll('div,span')].filter(e=>e.textContent.trim().startsWith(${JSON.stringify(name)})).sort((x,y)=>x.textContent.length-y.textContent.length)[0];if(!el)return null;const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2+${dy}]})()`);
  const g = await at('GROCERY', 40), a = await at('ADA', -30);
  await drag(g[0], g[1], a[0], a[1]); await shot('t2-grocery-to-ada');
  console.log('ORG card after dropping GROCERY on ADA:', /ORG/.test(await feedText()));
  await sleep(1200);
  await js('location.reload()'); await sleep(2500);
  await clickByText('RESET'); await sleep(400);
  console.log('reset confirm shown:', (await feedText()).includes('Start over?'));
  await clickByText('YES, FROM SCRATCH'); await sleep(600);
  const after = await js("JSON.parse(localStorage.getItem('the-system-live-v4')||'null')");
  console.log('after RESET, storage empty:', after === null, '| back on wake screen:', (await feedText()).includes('tap to wake'));
} else {
  await shot('p1-phone');
  const t = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await t('touchStart', [{ x: 150, y: 400, id: 1 }, { x: 240, y: 400, id: 2 }]);
  for (let i = 1; i <= 8; i++) { await t('touchMove', [{ x: 150 - i * 12, y: 400, id: 1 }, { x: 240 + i * 12, y: 400, id: 2 }]); await sleep(30); }
  await t('touchEnd', []); await sleep(400);
  console.log('zoom label after pinch:', (await feedText()).match(/\d+%/)?.[0]);
}
console.log('errors:', errors.length ? errors : 'none');
ws.close(); edge.kill();
process.exit(0);
