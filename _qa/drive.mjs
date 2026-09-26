// Drive the built app through Edge's DevTools protocol: the opening (wake, two
// questions, hire everyone, tour with the fix, end), then the pre-existing
// re-org/persistence regression checks, the scripted first-minute story and the
// "PIP asks less" cap, via the "skip" path. Desktop + phone.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// U12: one vocabulary for moods — grep the source itself for the retired words,
// since the sim only ever names them in comments/types once fixed, never in copy.
function grepSrcFor(words) {
  const root = fileURLToPath(new URL('../src', import.meta.url));
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = dir + '/' + name.name;
      if (name.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name.name)) {
        const text = readFileSync(p, 'utf8');
        for (const w of words) if (text.includes(w)) hits.push(p + ':' + w);
      }
    }
  };
  walk(root);
  return hits;
}
const u12Hits = grepSrcFor(['FRUSTRATED', 'STALLED', 'OVERWHELMED']);
console.log('U12 no FRUSTRATED/STALLED/OVERWHELMED in src:', u12Hits.length === 0, u12Hits.length ? JSON.stringify(u12Hits) : '');

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
const clickByPartial = (needle) => js(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(needle)}));if(!el)return false;el.click();return true;})()`);
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
// U10: the greeting ends with a real "Let's go" button, not tap-anywhere.
console.log('U10 "Let\'s go" button present:', !!(await rectOfButton("Let's go")));
const wentOk = await clickByText("Let's go");
if (!wentOk) await js('window.__sim.advanceGreet()');
await sleep(3000); // let "Should they check with you..." type out
await shot('o2-q1');
console.log('q1 asked:', (await js('window.__sim.speechText')) === 'Should they check with you before anything important?');
// Real tap on the Q1 answer button, to prove it is actually hittable.
const askRect = await rectOfButton('No, just handle it');
console.log('found "No, just handle it" button:', !!askRect);
if (askRect) await tap(askRect[0], askRect[1]);
else await js('window.__sim.answerQ1(false)');
await sleep(300);

await js('window.__sim.finishSpeech()');
console.log('q2 asked:', (await js('window.__sim.speechText')) === 'What should your helpers take off your plate first?');
await js("window.__sim.answerQ2('job')");
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
console.log('U3 sel cleared after stop1 fix (popup does not cover the tour):', await js('window.__sim.sel === null'));

// U14: the tour is two stops now -- NEXT at stop 1 ends it directly, no tools/recorder stops.
await js('window.__sim.tourNext()');
await sleep(1000);
console.log('onboarded after tour end:', await js('window.__sim.m.onboarded'));
console.log('tourOn after end:', await js('window.__sim.tourOn'));
await shot('o6-tour-end');
// U8: the closing line stays up for a few seconds after tourOn goes false.
console.log('U8 outro line still shown right after tourOn=false:', (await feedText()).includes("It's yours now"));
await sleep(5200);
console.log('U8 outro line gone after ~5s:', !(await feedText()).includes("It's yours now"));

// U2/U14: the dock only shows post-tour now; on phone it is the "+" button and its
// sheet carries one-time tips for tools and the recorder (no tour stop teaches them).
console.log('dock present at end:', MOBILE ? await js("!!document.getElementById('phone-add-btn')") : (await feedText()).includes('TOOLS'));
console.log('feed present at end:', (await feedText()).includes('PIP'));
if (MOBILE) {
  await js('window.__sim.openPhoneAdd()'); await sleep(300);
  console.log('U14 tools tip shown on first + sheet open:', (await feedText()).includes('drop it near the team'));
  console.log('U14 recorder tip shown on first + sheet open:', (await feedText()).includes('Watches a team'));
  await js("window.__sim.placeFurnFromSheet('mcp')"); await sleep(300);
  console.log('tool placed from the + sheet:', await js("window.__sim.m.furn.some(f=>f.type==='mcp')"));
  await js('window.__sim.openPhoneAdd()'); await sleep(300);
  console.log('U14 tips do not repeat on a second + sheet open:', !(await feedText()).includes('drop it near the team'));
  await js('window.__sim.closePhoneAdd()'); await sleep(200);
}
await shot('o8-end');
const savedOnboarded = await js("JSON.parse(localStorage.getItem('the-system-live-v4')||'null')?.onboarded");
console.log('onboarded persisted to storage:', savedOnboarded);

if (!MOBILE) {
  await js('location.reload()'); await sleep(2500);
  console.log('returning visitor skips the opening:', !(await feedText()).includes('tap to wake'));
  const fps = await js('new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++;performance.now()-t0<2000?requestAnimationFrame(f):r(Math.round(n/2))})()})');
  console.log('fps', fps);

  // --- Regression: "skip" still loads the full valley, and runs the scripted story. ---
  await js("localStorage.removeItem('the-system-live-v4'); location.reload()"); await sleep(2500);
  await js('window.__sim.skipIntro()'); await sleep(500);
  console.log('skip loads the full valley agent count (12):', await js('window.__sim.m.agents.length'));
  // U5: the primary-action pill reads the live needs count and its tap opens PIP's sheet.
  console.log('U5 pill reads needs count:', /things? need you|All clear/.test(await feedText()));
  await clickByPartial('need you'); await sleep(400); await shot('t1-pip-popup');
  console.log('PIP popup shows NEEDS YOU:', (await feedText()).includes('NEEDS YOU'));
  await js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"); await sleep(300);

  // The scripted first minute: wait for BILLS to get stuck, fix it, check the recap.
  await sleep(16000);
  console.log('story flagged BILLS stuck:', await js("!!(window.__sim.agent('money-bills') && window.__sim.agent('money-bills').blocked)"));
  await shot('o9-story-stuck');
  await js("(()=>{const sim=window.__sim,a=sim.agent('money-bills'); if(a) sim.unblock(a);})()");
  await sleep(500);
  console.log('story recap posted after the fix:', (await feedText()).includes('Morning recap'));
  await shot('o10-story-recap');

  // PIP asks less: after 60s of running, at most 3 asks, never two with the same text.
  await sleep(60000);
  const needsInfo = await js("(()=>{const n=window.__sim.m.needs;const texts=n.map((x)=>x.text);return {count:n.length,unique:new Set(texts).size};})()");
  console.log('at most 3 asks after 60s:', needsInfo.count <= 3 && needsInfo.unique === needsInfo.count, JSON.stringify(needsInfo));

  // U7: an idle valley stays healthy -- most agents are working or in flow, not sitting bored.
  const moodInfo = await js(`(()=>{
    const sim = window.__sim, t = performance.now()/1000;
    const live = sim.m.agents.filter(a => sim.team(a.team) && sim.team(a.team).state==='active');
    const healthy = live.filter(a => { const md = sim.mood(a, t); return md === 'working' || md === 'flow'; });
    return { total: live.length, healthy: healthy.length, pct: healthy.length / live.length };
  })()`);
  console.log('U7 >=60% working or in flow:', moodInfo.pct >= 0.6, JSON.stringify(moodInfo));

  const at = (name, dy = 0) => js(`(()=>{const el=[...document.querySelectorAll('div,span')].filter(e=>e.textContent.trim().startsWith(${JSON.stringify(name)})).sort((x,y)=>x.textContent.length-y.textContent.length)[0];if(!el)return null;const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2+${dy}]})()`);
  const g = await at('JOB HUNT', 40), a = await at('OTTO', -30);
  await drag(g[0], g[1], a[0], a[1]); await shot('t2-jobhunt-to-otto');
  console.log('ORG card after dropping JOB HUNT on OTTO:', /ORG/.test(await feedText()));
  await sleep(1200);
  await js('location.reload()'); await sleep(2500);
  await clickByText('RESET'); await sleep(400);
  console.log('reset confirm shown:', (await feedText()).includes('Start over?'));
  await clickByText('YES, FROM SCRATCH'); await sleep(600);
  const after = await js("JSON.parse(localStorage.getItem('the-system-live-v4')||'null')");
  console.log('after RESET, storage empty:', after === null, '| back on wake screen:', (await feedText()).includes('tap to wake'));
} else {
  await shot('p1-phone');
  // U2: -/%/+ zoom buttons are gone on phone (pinch works instead) -- read zoom straight off the sim.
  const t = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await t('touchStart', [{ x: 150, y: 400, id: 1 }, { x: 240, y: 400, id: 2 }]);
  for (let i = 1; i <= 8; i++) { await t('touchMove', [{ x: 150 - i * 12, y: 400, id: 1 }, { x: 240 + i * 12, y: 400, id: 2 }]); await sleep(30); }
  await t('touchEnd', []); await sleep(400);
  console.log('zoom after pinch:', await js('window.__sim.zoom'));

  // Phone: popups/feed open as a bottom sheet, no taller than ~55% of the viewport, town visible above.
  await js("window.__sim.select({kind:'sup', id:'pip'})"); await sleep(500);
  const sheetRatio = await js("(()=>{const el=document.querySelector('[data-bottom-sheet]');if(!el)return null;const r=el.getBoundingClientRect();return r.height/window.innerHeight;})()");
  console.log('phone bottom sheet height <= 60% of viewport:', sheetRatio != null && sheetRatio <= 0.6, sheetRatio);
  await shot('p2-phone-sheet');
  await js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"); await sleep(300);

  // U1: a fresh phone skip opens at a readable zoom, never a squint.
  await js("localStorage.removeItem('the-system-live-v4'); location.reload()"); await sleep(2500);
  await js('window.__sim.skipIntro()'); await sleep(500);
  console.log('U1 phone skip zoom >= 0.7:', await js('window.__sim.zoom >= 0.7'));
  await shot('p3-phone-skip-zoom');

  // U2: with nothing open, the old chrome (live-line, TOOLS grid) is gone and the new
  // chrome (the ? chip, FIT, the + button, the needs pill, the feed pill) is present,
  // and no bottom sheet is covering the world.
  const chrome = await js(`(()=>({
    moodChip: !!document.querySelector('[aria-label="Legend and reset"]'),
    fitBtn: !!document.querySelector('[aria-label="Fit view"]'),
    addBtn: !!document.getElementById('phone-add-btn'),
    feedPill: document.body.innerText.includes('PIP → YOU'),
    needsPill: /things? need you|All clear/.test(document.body.innerText),
    liveLineGone: !document.body.innerText.includes('live ·'),
    dockGridGone: !document.getElementById('dock-panel'),
    noSheetOpen: !document.querySelector('[data-bottom-sheet]'),
  }))()`);
  console.log('U2 phone chrome recedes to ?/FIT/+/pills, no sheet by default:', JSON.stringify(chrome));
  await shot('p4-phone-chrome');
}
console.log('errors:', errors.length ? errors : 'none');
ws.close(); edge.kill();
process.exit(0);
