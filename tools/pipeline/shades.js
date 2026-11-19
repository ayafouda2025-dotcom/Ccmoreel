// node shades.js OUT_DIR URL -> clicks every shade option, saves the main product image shown for it + a phone screenshot of the selector
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, url] = process.argv; const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(4000);
  const opts = await p.evaluate(() => [...document.querySelectorAll('button,label,[role=radio],li,span,div')].filter((e) => /^(FIRST LOVE|STARRY NIGHT|MOONDUST|MIDNIGHT KISS)$/.test(e.innerText.trim()) && e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return [e.innerText.trim(), r.x + r.width / 2, r.y + r.height / 2, e.tagName]; }));
  console.log('options', JSON.stringify(opts));
  const seen = new Set();
  for (const [name] of opts) {
    if (seen.has(name)) continue; seen.add(name);
    const el = p.getByText(name, { exact: true }).first(); await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click().catch((e) => console.log('click fail', name));
    await p.waitForTimeout(1800);
    const src = await p.evaluate(() => { const imgs = [...document.images].filter((i) => /zid/.test(i.currentSrc || i.src) && i.getBoundingClientRect().width > 250 && i.getBoundingClientRect().top < 900);
      imgs.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width); return imgs.length ? (imgs[0].currentSrc || imgs[0].src) : null; });
    console.log(name, src && src.slice(-60));
    if (src) { const img = await p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const x of a) s += String.fromCharCode(x); return btoa(s); }, src).catch(() => null);
      if (img) fs.writeFileSync(`${out}/shade_${name.replace(/ /g, '_')}.img`, Buffer.from(img, 'base64')); }
    await p.screenshot({ path: `${out}/sel_${name.replace(/ /g, '_')}.png` });
  }
  await b.close();
})();
