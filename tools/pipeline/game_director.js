// node game_director.js OUT_DIR
// One real take of the whole storyboard on a 390x844 phone (frames at 780x1688 via CDP screencast).
// Writes OUT_DIR/main/*.jpg, OUT_DIR/friend/*.jpg, OUT_DIR/log.json (marks, taps, pointer path, frame timestamps)
const { chromium } = require('playwright'); const fs = require('fs');
const { openGame, autoplay, startCast } = require('./game_lib');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const log = { marks: [], taps: [], pointer: [] }; log.pointer.items = [];
  // ---------- main player ----------
  const { ctx, p } = await openGame(b, { permissions: ['clipboard-read', 'clipboard-write'] });
  const cast = await startCast(ctx, p, `${out}/main`);
  const T0 = Date.now(); const now = () => (Date.now() - T0) / 1000;
  const mark = (name, extra = {}) => { log.marks.push({ t: now(), name, ...extra }); console.log(now().toFixed(2), name, JSON.stringify(extra)); };
  const tap = async (loc, name) => { const el = loc.first(); await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); const bb = await el.boundingBox({ timeout: 4000 }).catch(() => null);
    if (bb) { const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2; log.taps.push({ t: now(), x, y, name }); await p.mouse.move(x, y); await p.waitForTimeout(350); await p.mouse.click(x, y); } else { console.log('tap miss', name); await el.click({ timeout: 4000 }).catch(() => {}); } };
  const hold = (s) => p.waitForTimeout(s * 1000);

  await hold(1.5); mark('home'); await hold(2.0);
  await tap(p.getByText('العبي الآن'), 'play_now'); await hold(0.6); mark('journey0'); await hold(2.4);
  for (let lvl = 1; lvl <= 3; lvl++) {
    const sb = p.getByRole('button', { name: /ابدئي الرحلة|كملي|العبي المستوى|ابدئي/ });
    if (await sb.count()) { await tap(sb, 'start'); await hold(0.6); }
    else console.log('no start button; buttons=', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].map((e) => e.innerText.trim()).filter(Boolean))));
    const go = p.getByRole('button', { name: /يلا نبدأ/ });
    if (await go.count()) { mark('howto'); await hold(1.8); await tap(go, 'go'); }
    await hold(0.3); mark('level', { lvl });
    let fever = false, c5 = false;
    const st = await autoplay(p, { pointerLog: log.pointer, t0: T0, onTick: (s) => { if (s.combo >= 5 && !c5) { c5 = true; mark('combo5', { lvl }); } if (s.fever && !fever) { fever = true; mark('fever', { lvl }); } if (!s.fever) fever = false; } });
    mark('level_end', { lvl, status: st && st.status }); await hold(2.2);
    if (lvl === 1) {   // daily scratch card
      await tap(p.getByText(/اكشطيه الآن/), 'scratch_open'); await hold(0.8); mark('scratch');
      const cv = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 100 && r.width < 390); return c.length ? [c[0].x, c[0].y, c[0].width, c[0].height] : null; });
      if (cv) { await p.mouse.move(cv[0] + 20, cv[1] + 20); await p.mouse.down();
        for (let r = 0; r < 7; r++) { const y = cv[1] + 20 + r * (cv[3] - 40) / 6;
          for (let s = 0; s <= 14; s++) { const x = r % 2 ? cv[0] + cv[2] - 20 - s * (cv[2] - 40) / 14 : cv[0] + 20 + s * (cv[2] - 40) / 14; await p.mouse.move(x, y); log.pointer.push([now(), x, y]); await p.waitForTimeout(18); } }
        await p.mouse.up(); }
      mark('scratched'); await hold(2.4);
      await tap(p.getByRole('button', { name: /رجوع/ }), 'back'); await hold(1.0);
      await tap(p.getByRole('button', { name: /كملي اللعب|العبي الآن/ }), 'continue'); await hold(0.5); mark('journey1'); await hold(2.4);
    } else {
      const next = p.getByRole('button', { name: /كملي واربحي/ });
      if (lvl < 3 && await next.count()) { await tap(next, 'next'); await hold(0.5); mark('journey' + lvl); await hold(1.6); }
    }
  }
  // after level 3: back to the journey to show the revealed tiles, then home
  const home = p.getByRole('button', { name: /الرئيسية/ }); if (await home.count()) await tap(home, 'home'); await hold(1.0);
  await tap(p.getByRole('button', { name: /كملي اللعب/ }), 'journey'); await hold(0.5); mark('journey3'); await hold(2.4);
  await tap(p.getByRole('button', { name: /رجوع/ }), 'back'); await hold(1.0);
  // this or that
  await tap(p.getByText('هذا ولا هذا؟'), 'tot'); await hold(0.8); mark('tot');
  const picks = [];
  for (let i = 0; i < 10; i++) {
    const btns = p.locator('button').filter({ hasNotText: /الصوت|رجوع/ }); if (!(await btns.count())) break;
    const pick = btns.nth(i % 3 === 1 ? 1 : 0); picks.push((await pick.innerText()).trim()); await hold(0.35); await tap(pick, 'pick'); await hold(0.55);
  }
  await hold(0.8); mark('tot_result'); await hold(2.2);
  await tap(p.getByRole('button', { name: /تحدّي صاحبتك/ }), 'challenge'); await hold(0.8); mark('challenge'); await hold(1.6);
  await tap(p.getByRole('button', { name: /انسخي الرابط/ }), 'copy'); await hold(0.6);
  let link = null; try { link = await p.evaluate(() => navigator.clipboard.readText()); } catch {}
  console.log('LINK', link);
  await tap(p.getByRole('button', { name: /رجوع/ }), 'back'); await hold(0.8);
  for (let i = 0; i < 2; i++) { const h = p.getByRole('button', { name: /الرئيسية/ }); if (await h.count()) { await tap(h, 'home'); await hold(0.8); } }
  // gifts / wallet
  await tap(p.getByText(/هداياي وخزانتي/), 'gifts'); await hold(0.8); mark('gifts'); await hold(2.6);
  await p.mouse.move(195, 600); for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 22); await p.waitForTimeout(40); } mark('gifts_scrolled'); await hold(2.0);
  await tap(p.getByRole('button', { name: /رجوع/ }), 'back'); await hold(1.2); mark('home_end'); await hold(1.5);
  log.mainFrames = (await cast.stop()).map(([ts, f]) => [ts, f]);
  log.mainT0 = T0 / 1000;
  // ---------- the friend opens the challenge link and matches the picks ----------
  if (link && /^https?:/.test(link)) {
    const f = await openGame(b); await f.p.goto(link, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {}); await f.p.waitForTimeout(1200);
    const fcast = await startCast(f.ctx, f.p, `${out}/friend`); const F0 = Date.now(); const fm = (n) => { log.marks.push({ t: (Date.now() - F0) / 1000, name: n, friend: true }); console.log('friend', n); };
    fm('friend_start'); await f.p.waitForTimeout(1500);
    const start = f.p.getByRole('button', { name: /ابدئي|يلا|العبي|جربي|اختاري/ }); if (await start.count()) { await start.first().click().catch(() => {}); await f.p.waitForTimeout(900); }
    const want = new Set(picks.map((x) => x.split('\n')[0].trim()));
    for (let i = 0; i < 10; i++) {
      const opts = await f.p.evaluate(() => [...document.querySelectorAll('button')].map((e, k) => [k, e.innerText.split('\n')[0].trim()]).filter(([, t]) => t && !/الصوت|رجوع/.test(t)));
      if (opts.length < 2) break;
      const hit = opts.find(([, t]) => want.has(t)) || opts[0];
      const el = f.p.locator('button').nth(hit[0]); const bb = await el.boundingBox();
      if (bb) { await f.p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await f.p.waitForTimeout(300); await f.p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); }
      await f.p.waitForTimeout(700);
    }
    await f.p.waitForTimeout(1500); fm('friend_result');
    console.log('FRIEND TEXT', (await f.p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 500));
    await f.p.waitForTimeout(2500); log.friendFrames = await fcast.stop(); await f.ctx.close();
  }
  log.items = log.pointer.items; log.picks = picks; fs.writeFileSync(`${out}/log.json`, JSON.stringify(log)); await ctx.close(); await b.close(); console.log('done');
})();
