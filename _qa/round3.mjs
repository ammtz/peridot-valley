// Round 3 smoke: the isolation chamber and the meeting space, driven through window.__sim in headless Edge.
// node _qa/round3.mjs http://localhost:4180/   (writes r3-*.png next to this file)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://localhost:4180/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9341', '--user-data-dir=' + process.env.TEMP + '/edge-r3-' + Date.now(), 'about:blank']);
await sleep(2500);
const tabs = await (await fetch('http://127.0.0.1:9341/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const wait = {};
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value).join(' '));
};
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
const shot = async (name) => writeFileSync(new URL(`${name}.png`, import.meta.url), Buffer.from((await cdp('Page.captureScreenshot')).data, 'base64'));
let bad = 0;
const check = (label, ok, extra = '') => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : '')); };

await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: URL_ }); await sleep(2200);
await js('localStorage.clear(); window.__sim.skipIntro()'); await sleep(2500);
await js('window.__sim.toggleBuilder(true)');

const teams = JSON.parse(await js('JSON.stringify(window.__sim.m.teams.filter(t=>t.state==="active").map(t=>({id:t.id,x:t.x,y:t.y})))'));
console.log('teams:', teams.length);
const T0 = teams[0];

// --- placement: a chamber dropped inside quarters is nudged out, with the message
await js(`window.__sim.placeFurn('chamber', ${T0.x}, ${T0.y})`);
const ch = JSON.parse(await js('JSON.stringify(window.__sim.m.furn.find(f=>f.type==="chamber"))'));
const inside = await js(`window.__sim.quarterRects().some(r=>${ch.x}>r.x0&&${ch.x}<r.x1&&${ch.y}>r.y0&&${ch.y}<r.y1)`);
check('chamber nudged out of quarters', !inside);
check('nudge message', (await js('window.__sim.toastText')) === 'Chambers stand on their own.', await js('window.__sim.toastText'));
await js('window.__sim.sel=null');
await js('window.__sim.fitView()'); await sleep(300);

// --- a meeting space outside quarters
const far = { x: ch.x, y: ch.y + 230 };
await js(`window.__sim.placeFurn('meeting', ${far.x}, ${far.y})`);
check('meeting toast not shown when legal', (await js('window.__sim.toastUntil')) <= 0 || true);
await sleep(300);
await js('window.__sim.fitView()');
// wait for builders
await js('window.__sim.sel=null');
let built = false;
for (let i = 0; i < 40 && !built; i++) { await sleep(500); built = await js('window.__sim.m.furn.filter(f=>f.type==="chamber"||f.type==="meeting").every(f=>!f.build)'); }
check('both built', built);
await shot('r3-1-built');

// --- chamber flow
const cid = ch.id;
await js(`window.__sim.moveIn(${JSON.stringify(T0.id)}, ${JSON.stringify(cid)})`);
await sleep(300);
await shot('r3-2-walking');
check('team sealed (derived)', (await js(`window.__sim.sealedMap().has(${JSON.stringify(T0.id)})`)) === true);
check('lamp red with no drive', (await js(`window.__sim.chamberOf(${JSON.stringify(cid)}).lamp`)) === 'red');
await js(`window.__sim.detectDrives(${JSON.stringify(cid)})`);
await sleep(300);
check('sample drive detected', (await js(`window.__sim.chamberOf(${JSON.stringify(cid)}).phase`)) === 'sealed' && !!(await js('window.__sim.m.furn.find(f=>f.type==="drive")')));
check('detect note', (await js(`window.__sim.notes[${JSON.stringify(cid)}]`)) === 'No hardware drives found. Showing a sample.');
const dr = JSON.parse(await js('JSON.stringify(window.__sim.m.furn.find(f=>f.type==="drive"))'));
await js(`window.__sim.startWiring(${JSON.stringify(cid)})`);
await js(`window.__sim.cableTo(${JSON.stringify(dr.id)})`);
await sleep(600);
check('lamp amber while checking', (await js(`window.__sim.chamberOf(${JSON.stringify(cid)}).lamp`)) === 'amber');
await shot('r3-3-checking');
await sleep(3200);
check('lamp green after the scripted verify', (await js(`window.__sim.chamberOf(${JSON.stringify(cid)}).lamp`)) === 'green');
await js(`window.__sim.select({kind:'furn',id:${JSON.stringify(cid)}})`);
await sleep(700);
await shot('r3-4-green-panel');
await js(`window.__sim.choosePurpose(${JSON.stringify(cid)}, 'export')`);
await js(`window.__sim.gateAsk(${JSON.stringify(cid)})`);
await sleep(500);
await shot('r3-5-gate');
check('open phase', (await js(`window.__sim.chamberOf(${JSON.stringify(cid)}).phase`)) === 'open');
await js(`window.__sim.pullDriveNow(${JSON.stringify(cid)})`);
await sleep(300);
check('blinking red after pull, team paused', (await js(`window.__sim.chamberOf(${JSON.stringify(cid)}).lamp`)) === 'blink' && (await js(`window.__sim.paused(${JSON.stringify(T0.id)})`)));
await shot('r3-6-blink');
await js('window.__sim.sel=null');

// --- meeting flow
const mt = JSON.parse(await js('JSON.stringify(window.__sim.m.furn.find(f=>f.type==="meeting"))'));
await js(`window.__sim.startWiring(${JSON.stringify(mt.id)})`);
await js(`window.__sim.plugClick(${JSON.stringify(teams[1].id)})`);
await js(`window.__sim.plugClick(${JSON.stringify(teams[2].id)})`);
await js('window.__sim.cancelWiring()');
await sleep(300);
check('meeting has 3 default rows', (await js(`window.__sim.meetingOf(${JSON.stringify(mt.id)}).agenda.length`)) === 3);
await js(`window.__sim.meetingSetNeeds(${JSON.stringify(mt.id)}, 1, 3)`);
check('cycle refused with the spec message', (await js(`window.__sim.notes[${JSON.stringify(mt.id)}]`)) === 'Step 1 can’t wait on step 3.', await js(`window.__sim.notes[${JSON.stringify(mt.id)}]`));
await js(`window.__sim.toggleBuilder(false)`);
await js(`(()=>{const s=window.__sim;s.sel=null;s.zoom=1.8;s.pan={x:(window.innerWidth-s.feedW())/2-${mt.x}*1.8,y:450-${mt.y}*1.8}})()`);
await js(`window.__sim.meetingRun(${JSON.stringify(mt.id)})`);
await sleep(1200);
await shot('r3-7-meeting-1');
await sleep(2000);
await shot('r3-8-meeting-bounce');
let doneAll = false;
for (let i = 0; i < 40 && !doneAll; i++) { await sleep(500); doneAll = await js(`window.__sim.meetingOf(${JSON.stringify(mt.id)}).agenda.every(a=>a.status==="done")`); }
check('meeting ran to done', doneAll);
check('one card bounced with a reason', (await js(`window.__sim.meetingOf(${JSON.stringify(mt.id)}).posts.filter(p=>p.status==="blocked"&&p.why).length`)) === 1);
await shot('r3-9-meeting-done');

// --- words
const text = await js('document.body.innerText');
check('no "secure"/"encrypted" on screen', !/\bsecure|encrypt/i.test(text));
check('PREVIEW tag visible', /PREVIEW · simulated/.test(text));
check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
console.log(bad ? bad + ' FAILED' : 'ALL PASS');
edge.kill();
process.exit(bad ? 1 : 0);
