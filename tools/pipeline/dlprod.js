// node dlprod.js URL OUT_DIR  -> saves every product image the page loads (by response), named <md5>.<ext>
const { chromium } = require('playwright'); const fs = require('fs'); const crypto = require('crypto');
(async () => {
  const [, , url, out] = process.argv; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const saved = new Map();
  p.on('response', async (r) => {
    const u = r.url(); if (!/zid\.store/.test(u) || /static\//.test(u)) return;
    try {
      const buf = await r.body(); if (buf.length < 15000) return;
      const ct = r.headers()['content-type'] || ''; const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : null;
      if (!ext) return;
      const key = u.replace(/^.*?(https:\/\/media\.zid\.store\/)/, '$1').split('?')[0];
      if (saved.has(key) && saved.get(key) >= buf.length) return; saved.set(key, buf.length);
      fs.writeFileSync(`${out}/${crypto.createHash('md5').update(key).digest('hex').slice(0, 8)}.${ext}`, buf);
    } catch {}
  });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  for (let y = 0; y < 3000; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(300); }
  await p.evaluate(() => scrollTo(0, 0));
  const thumbs = await p.$$('img'); for (const t of thumbs.slice(0, 40)) { try { await t.click({ timeout: 300 }); await p.waitForTimeout(150); } catch {} }
  await p.waitForTimeout(1500); console.log('saved', saved.size); await b.close();
})();
