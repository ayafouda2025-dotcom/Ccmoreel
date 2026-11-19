// node shades2.js OUT_DIR URL -> finds the image next to each "الدرجه <NAME>" row and the swatch colours of the shade selector
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, url] = process.argv; const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(4000);
  for (let y = 0; y < 6000; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(250); }
  const rows = await p.evaluate(() => {
    const res = [];
    for (const e of document.querySelectorAll('*')) {
      const t = (e.innerText || '').trim();
      const m = t.match(/^الدرجه\s*(FIRST LOVE|STARRY NIGHT|MOONDUST|MIDNIGHT KISS)/);
      if (!m || e.children.length > 12) continue;
      let box = e; for (let k = 0; k < 4 && box && !box.querySelector('img'); k++) box = box.parentElement;
      const img = box && box.querySelector('img'); if (img) res.push([m[1], img.currentSrc || img.src, (img.alt || '')]);
    }
    return res;
  });
  const swatches = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 14 && r.width < 40 && Math.abs(r.width - r.height) < 2 && cs.borderRadius.includes('50') && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && (cs.backgroundImage === 'none'); })
    .map((e) => [e.getAttribute('title') || e.getAttribute('aria-label') || e.getAttribute('data-name') || '', getComputedStyle(e).backgroundColor]).slice(0, 12));
  console.log('swatches', JSON.stringify(swatches));
  const done = new Set();
  for (const [name, src] of rows) { if (done.has(name)) continue; done.add(name);
    const full = src.replace(/img\.zid\.store\/img\/[^/]+\//, '');
    console.log(name, full.slice(-70));
    const img = await p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const x of a) s += String.fromCharCode(x); return btoa(s); }, full).catch(() => null);
    if (img) fs.writeFileSync(`${out}/v_${name.replace(/ /g, '_')}.img`, Buffer.from(img, 'base64')); }
  await b.close();
})();
