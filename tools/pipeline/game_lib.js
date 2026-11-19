// shared helpers: open the game with the engine patched (window.__G) and an autopilot that plays a level to the end
const fs = require('fs'); const path = require('path');
async function openGame(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar-SA', ...opts });
  await ctx.route(/engine-[^/]+\.js$/, async (route) => {
    let body = fs.readFileSync(path.join(__dirname, 'game/src', path.basename(new URL(route.request().url()).pathname)), 'utf8');
    body = body.replace('function Q(e){return e.config.bagWidth*', 'function Q(e){window.__G=e;return e.config.bagWidth*');
    route.fulfill({ status: 200, body, headers: { 'content-type': 'application/javascript' } });
  });
  const p = await ctx.newPage();
  await p.goto('https://kara-duo-play-and-win.lovable.app/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(1200);
  return { ctx, p };
}
async function dump(p, tag) {
  const txt = (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 700);
  const btns = await p.evaluate(() => [...document.querySelectorAll('button,[role=button],a')].map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\n+/g, ' / ')).filter(Boolean));
  console.log(`--- ${tag}\nTEXT ${txt}\nBTNS ${JSON.stringify(btns)}`);
}
// plays until the level ends; onTick(state) is called every step; returns final status
async function autoplay(p, { onTick = () => {}, pointerLog = null, t0 = Date.now(), dodge = true } = {}) {
  const box = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].pop().getBoundingClientRect(); return [c.x, c.y, c.width, c.height]; });
  const sx = box[2] / 400, sy = box[3] / 720, toX = (wx) => box[0] + wx * sx;
  let mx = toX(200); const my = box[1] + 600 * sy; await p.mouse.move(mx, my); await p.mouse.down();
  let st = null;
  for (let i = 0; i < 1500; i++) {
    st = await p.evaluate(() => { const g = window.__G; if (!g) return null; return { status: g.status, combo: g.combo, fever: g.elapsed < g.feverUntil, score: g.score, caught: g.caught,
      items: g.items.map((it) => ({ x: it.x, y: it.y, bad: it.kind === 'stain' || it.kind === 'empty_box' || it.kind === 'glow_remover', gold: it.kind === 'golden' })) }; });
    if (!st) { await p.waitForTimeout(50); continue; }
    if (st.status !== 'playing') break;
    onTick(st);
    if (pointerLog && pointerLog.items) pointerLog.items.push([(Date.now() - t0) / 1000, st.items.filter((it) => it.bad || it.gold).map((it) => [it.bad ? 'bad' : 'gold', +(box[0] + it.x * sx).toFixed(1), +(box[1] + it.y * sy).toFixed(1)])]);
    const good = st.items.filter((it) => !it.bad && it.y < 680).sort((a, b) => (b.y + (b.gold ? 120 : 0)) - (a.y + (a.gold ? 120 : 0)));
    let tx = good.length ? good[0].x : 200;
    if (dodge) for (const bad of st.items.filter((it) => it.bad && it.y > 470 && it.y < 700)) if (Math.abs(bad.x - tx) < 60) tx = bad.x + (tx >= bad.x ? 70 : -70);
    tx = Math.max(40, Math.min(360, tx));
    mx += Math.max(-26, Math.min(26, toX(tx) - mx));
    await p.mouse.move(mx, my); if (pointerLog) pointerLog.push([(Date.now() - t0) / 1000, mx, my]);
    await p.waitForTimeout(16);
  }
  await p.mouse.up();
  return st;
}
// CDP screencast at device resolution -> frames on disk with timestamps
async function startCast(ctx, p, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(p); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const f = `${dir}/f${String(n++).padStart(6, '0')}.jpg`; fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push([metadata.timestamp, f]);
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  return { stop: async () => { await cdp.send('Page.stopScreencast'); return frames; } };
}
module.exports = { openGame, dump, autoplay, startCast };
