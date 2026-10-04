// Animation cadence in headless Edge: how often the screen actually updates while the valley idles.
// Samples sim.renderTicks on every rAF for N seconds and reports the gaps between visual updates,
// the worst 1 s window, and long tasks (>50 ms). node _qa/lag.mjs http://localhost:4180/ [seconds] [cpuRate]
import { spawn } from 'node:child_process';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const SECS = Number(process.argv[3] || 20);
const RATE = Number(process.argv[4] || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9337', '--user-data-dir=' + process.env.TEMP + '/edge-lag-' + Date.now(), 'about:blank']);
await sleep(2500);
const tabs = await (await fetch('http://127.0.0.1:9337/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: URL_ }); await sleep(2200);
await js('localStorage.clear(); window.__sim.skipIntro()'); await sleep(3000);
await cdp('Emulation.setCPUThrottlingRate', { rate: RATE });
const out = await js(`new Promise(res=>{
  const lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>lt.push(e.duration))).observe({entryTypes:['longtask']})}catch(e){}
  const t0=performance.now();let lastRT=window.__sim.renderTicks,lastUp=t0,last=t0;const gaps=[],raf=[],stamps=[];
  const f=t=>{raf.push(t-last);last=t;const rt=window.__sim.renderTicks;if(rt!==lastRT){gaps.push(t-lastUp);stamps.push(t-t0);lastUp=t;lastRT=rt}
    if(t-t0<${SECS}*1000)requestAnimationFrame(f);else{
      const s=a=>a.slice().sort((x,y)=>x-y),q=(a,p)=>s(a)[Math.min(a.length-1,Math.floor(a.length*p))];
      let worst=1e9;for(let w=0;w+1000<=${SECS}*1000;w+=500){const n=stamps.filter(x=>x>=w&&x<w+1000).length;worst=Math.min(worst,n)}
      res({updatesPerSec:+(gaps.length/${SECS}).toFixed(1),worstSecondUpdates:worst,gapP50:+q(gaps,.5).toFixed(1),gapP95:+q(gaps,.95).toFixed(1),gapMax:+Math.max(...gaps).toFixed(1),rafP50:+q(raf,.5).toFixed(1),rafP99:+q(raf,.99).toFixed(1),rafMax:+Math.max(...raf).toFixed(1),longTasks:lt.length,longTaskMax:lt.length?+Math.max(...lt).toFixed(0):0})}};
  requestAnimationFrame(f)})`);
console.log(`cpu x${RATE}, ${SECS}s idle:`, JSON.stringify(out));
edge.kill(); process.exit(0);
