// Drive the built app through Edge's DevTools protocol: tap, drag, reload, fps, errors.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const [W, H, MOBILE] = process.argv[3] === 'phone' ? [390, 844, true] : [1440, 900, false];
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
const shot = async (name) => writeFileSync(`${name}.png`, Buffer.from((await cdp('Page.captureScreenshot')).data, 'base64'));
const mouse = (type, x, y) => cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
async function drag(x0, y0, x1, y1) {
  await mouse('mousePressed', x0, y0);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await sleep(30); }
  await mouse('mouseReleased', x1, y1); await sleep(400);
}
async function tap(x, y) { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await sleep(500); }

await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE });
if (MOBILE) await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
await cdp('Page.navigate', { url: URL_ }); await sleep(2500);
await js("localStorage.removeItem('the-system-live-v4'); location.reload()"); await sleep(2500);

const fps = await js('new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++;performance.now()-t0<2000?requestAnimationFrame(f):r(Math.round(n/2))})()})');
console.log('fps', fps);
const feedText = () => js('document.body.innerText');

if (!MOBILE) {
  await tap(574, 120); await shot('t1-pip-popup');
  console.log('PIP popup shows NEEDS YOU:', (await feedText()).includes('NEEDS YOU'));
  await js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"); await sleep(300);
  const at = (name, dy = 0) => js(`(()=>{const el=[...document.querySelectorAll('div,span')].filter(e=>e.textContent.trim().startsWith(${JSON.stringify(name)})).sort((x,y)=>x.textContent.length-y.textContent.length)[0];if(!el)return null;const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2+${dy}]})()`);
  const g = await at('GROCERY', 40), a = await at('ADA', -30);
  console.log('grocery', g, 'ada', a);
  await drag(g[0], g[1], a[0], a[1]); await shot('t2-grocery-to-ada');
  console.log('ORG card after dropping GROCERY on ADA:', /ORG/.test(await feedText()));
  const o = await at('OTTO', -30), a2 = await at('ADA', -30);
  await drag(o[0], o[1], a2[0], a2[1]); await shot('t3-otto-to-ada');
  console.log('ORG cards now:', ((await feedText()).match(/ORG/g) || []).length);
  await sleep(1800);
  await js('location.reload()'); await sleep(2500); await shot('t4-after-reload');
  const saved = await js("JSON.parse(localStorage.getItem('the-system-live-v4')||'null')");
  const sups = saved?.sups || saved?.managers || [];
  console.log('saved keys:', saved && Object.keys(saved).join(','));
  console.log('OTTO boss after reload:', JSON.stringify(sups.find?.((s) => s.name === 'OTTO' || s.id === 'otto')?.boss));
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='RESET').click()"); await sleep(800);
  const after = await js("JSON.parse(localStorage.getItem('the-system-live-v4')||'null')");
  console.log('after RESET, OTTO boss:', JSON.stringify((after?.sups||[]).find(s=>s.id==='otto')?.boss), '| storage empty:', after===null);
  await shot('t5-after-reset');
  const teams = saved?.teams || [];
  console.log('GROCERY boss after reload:', JSON.stringify(teams.find?.((t) => t.name === 'GROCERY')?.boss));
} else {
  await shot('p1-phone');
  const t = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await t('touchStart', [{ x: 150, y: 400, id: 1 }, { x: 240, y: 400, id: 2 }]);
  for (let i = 1; i <= 8; i++) { await t('touchMove', [{ x: 150 - i * 12, y: 400, id: 1 }, { x: 240 + i * 12, y: 400, id: 2 }]); await sleep(30); }
  await t('touchEnd', []); await sleep(400); await shot('p2-after-pinch');
  console.log('zoom label after pinch:', (await feedText()).match(/\d+%/)?.[0]);
}
console.log('errors:', errors.length ? errors : 'none');
ws.close(); edge.kill();
process.exit(0);
