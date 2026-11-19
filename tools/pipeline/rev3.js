// node rev3.js OUT.json URL... -> {url: [review texts]} ; clicks any "load more reviews" control repeatedly
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, ...urls] = process.argv; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  const res = {};
  for (const u of urls) {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(4000);
    for (let y = 0; y < 9000; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(200); }
    const labels = await p.evaluate(() => [...document.querySelectorAll('button,a')].map((e) => e.innerText.trim()).filter((t) => /المزيد|تحميل|عرض/.test(t)));
    console.log('load-more candidates', JSON.stringify(labels));
    const txt = await p.evaluate(() => document.body.innerText);
    const s = txt.lastIndexOf('أضف تقييمك'), e = txt.indexOf('\nالأسئلة', s);
    const lines = txt.slice(s + 10, e > s ? e : undefined).split('\n').map((x) => x.trim()).filter(Boolean);
    const revs = []; for (let i = 0; i + 2 < lines.length; i++) if (/^منذ /.test(lines[i + 1])) { revs.push(lines[i + 2]); i += 2; }
    res[u] = revs; console.log(u.slice(0, 70), revs.length);
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 1)); await b.close();
})();
