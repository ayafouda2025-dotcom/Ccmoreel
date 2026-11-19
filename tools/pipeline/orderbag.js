// node orderbag.js OUT_DIR PRODUCT_URL -> phone screenshots: bundles page scrolled to the bag card, product page, add-to-cart area
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, productUrl] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const info = {};
  await p.goto('https://karaduo.com/categories/1397956/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  info.card = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /شنطة مكياج احترافية/.test(x.innerText) && x.getBoundingClientRect().width > 0);
    if (!a) return null; const card = a.closest('div') || a; card.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.waitForTimeout(1500);
  info.card2 = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /شنطة مكياج احترافية/.test(x.innerText) && x.getBoundingClientRect().width > 0);
    if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.screenshot({ path: `${out}/02_bundles_bag.png` });
  await p.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/03_product.png` });
  await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((x) => /إضافة للسلة/.test(x.innerText) && x.getBoundingClientRect().width > 120); if (bt) bt.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(800);
  info.add = await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((x) => /إضافة للسلة/.test(x.innerText) && x.getBoundingClientRect().width > 120);
    if (!bt) return null; const r = bt.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.screenshot({ path: `${out}/04_add.png` });
  fs.writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1)); console.log(JSON.stringify(info));
  await b.close();
})();
