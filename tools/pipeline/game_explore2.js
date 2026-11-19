// node game_explore2.js OUT_DIR -> win level 1, then walk scratch card, this-or-that and gifts screens with screenshots + text dumps
const { chromium } = require('playwright'); const { openGame, dump, autoplay } = require('./game_lib');
(async () => {
  const out = process.argv[2]; const b = await chromium.launch(); const { p } = await openGame(b);
  let n = 0; const shot = async (tag) => { await p.screenshot({ path: `${out}/x${String(n++).padStart(2, '0')}_${tag}.png` }); await dump(p, tag); };
  await p.getByText('العبي الآن').click(); await p.waitForTimeout(1200);
  await p.getByText('ابدئي الرحلة').click(); await p.waitForTimeout(800);
  await p.getByRole('button', { name: /يلا نبدأ/ }).click(); await p.waitForTimeout(300);
  const st = await autoplay(p); console.log('level1', st && st.status);
  await p.waitForTimeout(2500); await shot('win');
  // scratch card
  const sc = p.getByText(/اكشطيه الآن/).first(); if (await sc.count()) { await sc.click(); await p.waitForTimeout(1500); await shot('scratch');
    const cv = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 100 && r.width < 390); return c.length ? [c[0].x, c[0].y, c[0].width, c[0].height] : null; });
    console.log('scratch canvas', JSON.stringify(cv));
    if (cv) { await p.mouse.move(cv[0] + 10, cv[1] + 10); await p.mouse.down();
      for (let r = 0; r < 8; r++) { const y = cv[1] + 15 + r * (cv[3] - 30) / 7; await p.mouse.move(r % 2 ? cv[0] + 10 : cv[0] + cv[2] - 10, y, { steps: 12 }); }
      await p.mouse.up(); }
    await p.waitForTimeout(2000); await shot('scratched'); }
  // back home
  for (let i = 0; i < 3; i++) { const bk = p.getByRole('button', { name: /رجوع|الرئيسية|إغلاق|تم/ }).first(); if (await bk.count()) { await bk.click().catch(() => {}); await p.waitForTimeout(900); } }
  await shot('home_after');
  const tt = p.getByText('هذا ولا هذا؟').first(); if (await tt.count()) { await tt.click(); await p.waitForTimeout(1500); await shot('this_or_that'); }
  for (let i = 0; i < 3; i++) { const bk = p.getByRole('button', { name: /رجوع|الرئيسية|إغلاق/ }).first(); if (await bk.count()) { await bk.click().catch(() => {}); await p.waitForTimeout(900); } }
  const gf = p.getByText(/هداياي وخزانتي/).first(); if (await gf.count()) { await gf.click(); await p.waitForTimeout(1500); await shot('gifts');
    await p.mouse.wheel(0, 700); await p.waitForTimeout(800); await shot('gifts_scrolled'); }
  await b.close();
})();
