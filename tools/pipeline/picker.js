// node picker.js OUT_DIR URL -> scrolls the shade picker into view; dumps clickable things around it; screenshot before and after choosing STARRY NIGHT
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, url] = process.argv; const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  const sp = p.getByText('MIDNIGHT KISS', { exact: true }).first(); await sp.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, 250)); await p.waitForTimeout(800);
  const near = await p.evaluate(() => { const s = [...document.querySelectorAll('span')].find((e) => e.innerText.trim() === 'MIDNIGHT KISS'); const r0 = s.getBoundingClientRect();
    return [...document.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 10 && r.width < 80 && r.height > 10 && r.height < 80 && Math.abs(r.top - r0.top) < 120 && e.children.length === 0; })
      .map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return [e.tagName, (e.getAttribute('title') || e.getAttribute('aria-label') || e.getAttribute('alt') || e.innerText || '').trim().slice(0, 30), Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2), Math.round(r.width), cs.backgroundColor, (e.currentSrc || e.src || '').slice(-30)]; }); });
  console.log(JSON.stringify(near));
  await p.screenshot({ path: `${out}/04_shades.png` });
  fs.writeFileSync(`${out}/near.json`, JSON.stringify(near));
  await b.close();
})();
