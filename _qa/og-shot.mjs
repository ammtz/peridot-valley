// One-off: screenshot the full valley at 1200x630 for public/og.png. Same
// headless-Edge approach as drive.mjs; not part of the regular QA run.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const OUT = new URL('../public/og.png', import.meta.url);
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9334',
  '--user-data-dir=' + process.env.TEMP + '/edge-og-' + Date.now(), 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
const tabs = await (await fetch('http://127.0.0.1:9334/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;

await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: URL_ }); await sleep(2500);
await js("localStorage.removeItem('the-system-live-v4'); location.reload()"); await sleep(2500);
await js('window.__sim.skipIntro()'); await sleep(600);
await js('window.__sim.storyOn = false; window.__sim.notify();'); await sleep(300);
await js('window.__sim.fitView()'); await sleep(400);
const data = (await cdp('Page.captureScreenshot', { format: 'png' })).data;
writeFileSync(OUT, Buffer.from(data, 'base64'));
console.log('wrote', OUT.pathname);
ws.close(); edge.kill();
process.exit(0);
