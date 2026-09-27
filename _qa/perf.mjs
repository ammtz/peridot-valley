// Main-thread cost of the running valley (2026-09-27). Opens the full valley, then over
// 5 s reports script/layout/style time per second and renders per second, at a normal CPU
// and at 4x CPU throttle (a mid-range phone). node _qa/perf.mjs http://localhost:4180/ [phone]
import { spawn } from 'node:child_process';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const [W, H, M] = process.argv[3] === 'phone' ? [390, 844, true] : [1440, 900, false];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9336', '--user-data-dir=' + process.env.TEMP + '/edge-perf-' + Date.now(), 'about:blank']);
await sleep(2500);
const tabs = await (await fetch('http://127.0.0.1:9336/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Performance.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: M });
await cdp('Page.navigate', { url: URL_ }); await sleep(2200);
await js('localStorage.clear(); window.__sim.skipIntro()'); await sleep(3000);
const metric = async () => Object.fromEntries((await cdp('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
for (const rate of [1, 4]) {
  await cdp('Emulation.setCPUThrottlingRate', { rate });
  await sleep(500);
  const a = await metric(); const r0 = await js('window.__sim.renderTicks');
  const fr = js(`new Promise(res=>{const d=[];let l=performance.now(),n=0;const f=t=>{d.push(t-l);l=t;if(++n<200)requestAnimationFrame(f);else{d.sort((x,y)=>x-y);res({p50:d[100].toFixed(1),p95:d[190].toFixed(1)})}};requestAnimationFrame(f)})`);
  await sleep(5000);
  const b = await metric(); const r1 = await js('window.__sim.renderTicks');
  const per = (k) => (((b[k] - a[k]) / 5) * 1000).toFixed(0) + 'ms/s';
  console.log(`cpu x${rate}: script ${per('ScriptDuration')} layout ${per('LayoutDuration')} style ${per('RecalcStyleDuration')} task ${per('TaskDuration')} renders/s ${((r1 - r0) / 5).toFixed(1)} frames`, await fr, 'DOM nodes', b.Nodes);
}
// Pan drag at 4x: frame pacing while the whole world moves under a finger.
await cdp('Emulation.setCPUThrottlingRate', { rate: 4 });
const mouse = (type, x, y) => cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const frP = js(`new Promise(res=>{const d=[];let l=performance.now(),n=0;const f=t=>{d.push(t-l);l=t;if(++n<90)requestAnimationFrame(f);else{d.sort((x,y)=>x-y);res({p50:d[45].toFixed(1),p95:d[85].toFixed(1),max:d[89].toFixed(1)})}};requestAnimationFrame(f)})`);
await mouse('mousePressed', W / 2, H / 2 + 40);
for (let i = 1; i <= 60; i++) { await mouse('mouseMoved', W / 2 + Math.sin(i / 6) * 120, H / 2 + 40 + i * 2); await sleep(16); }
await mouse('mouseReleased', W / 2, H / 2 + 160);
console.log('pan drag at x4 frames', await frP);
edge.kill(); process.exit(0);
