// Layout + smoothness audit (2026-09-27). For each viewport, open the full valley via
// the skip path, then report: fixed UI pieces that overlap each other, world boxes
// (rooms, managers) hidden under fixed UI, horizontal overflow, and frame pacing of a
// moving agent. Screenshots land in _qa/audit-<w>x<h>.png.
//   node _qa/audit.mjs http://localhost:4180/
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const VIEWS = [[1440, 900, false], [1366, 768, false], [1280, 720, false], [1024, 768, false], [820, 1180, true], [390, 844, true], [360, 740, true]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9335', '--user-data-dir=' + process.env.TEMP + '/edge-audit-' + Date.now(), 'about:blank']);
await sleep(2500);
const tabs = await (await fetch('http://127.0.0.1:9335/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const wait = {}; const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
};
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
await cdp('Runtime.enable'); await cdp('Page.enable');

const PROBE = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return null;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null; return r; };
  const fixed = [...document.querySelectorAll('body *')].filter((el) => getComputedStyle(el).position === 'fixed')
    .map((el) => ({ el, r: vis(el) })).filter((x) => x.r && !(x.r.width >= vw - 2 && x.r.height >= vh - 2))
    .filter((x) => getComputedStyle(x.el).pointerEvents !== 'none');
  const name = (el) => el.id || el.getAttribute('aria-label') || (el.innerText || '').trim().split('\\n')[0].slice(0, 28) || el.tagName;
  const hit = (a, b, pad = 0) => a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad;
  const overlaps = [];
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
    const A = fixed[i], B = fixed[j]; if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    if (hit(A.r, B.r, 2)) overlaps.push(name(A.el) + ' <> ' + name(B.el));
  }
  const worldBoxes = [...document.querySelectorAll('[data-room], [data-mgr]')].map((el) => ({ el, r: el.getBoundingClientRect() }));
  const covered = [];
  for (const w of worldBoxes) for (const f of fixed) if (hit(w.r, f.r, 6)) { covered.push((w.el.dataset.room || w.el.dataset.mgr) + ' under ' + name(f.el)); break; }
  const offscreen = worldBoxes.filter((w) => w.r.right < 8 || w.r.left > vw - 8 || w.r.bottom < 8 || w.r.top > vh - 8).length;
  return { overlaps: [...new Set(overlaps)], covered, worldBoxes: worldBoxes.length, offscreen, hscroll: document.documentElement.scrollWidth > vw + 1 };
})()`;

const FRAMES = `new Promise((res) => { const d = []; let last = performance.now(); let n = 0;
  const f = (t) => { d.push(t - last); last = t; if (++n < 180) requestAnimationFrame(f); else {
    const sorted = d.slice(5).sort((a, b) => a - b); res({ p50: sorted[sorted.length >> 1].toFixed(1), p95: sorted[Math.floor(sorted.length * .95)].toFixed(1),
      renders: window.__sim.renderTicks }); } }; requestAnimationFrame(f); })`;

const report = [];
for (const [w, h, mobile] of VIEWS) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await cdp('Page.navigate', { url: URL_ }); await sleep(2200);
  await js('localStorage.clear(); window.__sim && window.__sim.skipIntro()'); await sleep(4000);
  const r0 = await js('window.__sim.renderTicks');
  const frames = await js(FRAMES);
  const probe = await js(PROBE);
  const shot = await cdp('Page.captureScreenshot');
  writeFileSync(new URL(`audit-${w}x${h}.png`, import.meta.url), Buffer.from(shot.data, 'base64'));
  report.push({ view: `${w}x${h}`, ...probe, frameMs: frames, rendersIn3s: frames.renders - r0 });
}
console.log(JSON.stringify(report, null, 1));
console.log('errors:', errors.length ? errors : 'none');
edge.kill(); process.exit(0);
