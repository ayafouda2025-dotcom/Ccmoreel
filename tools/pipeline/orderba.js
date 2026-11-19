// node orderba.js OUT_DIR PRODUCT_URL -> phone screenshots for ordering the Beauty Artist complete bag + element boxes (CSS px)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, productUrl] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const info = {};
  const box = (re) => p.evaluate((src) => { const r = new RegExp(src); const a = [...document.querySelectorAll('a,button')].find((x) => r.test(x.innerText) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().top > 0);
    if (!a) return null; const q = a.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }, re.source);
  await p.goto('https://karaduo.com/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/01_home.png` }); info.home_bundles = await box(/^البكجات$/);
  await p.goto('https://karaduo.com/categories/1397956/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /بيوتي ارتست المتكاملة/.test(x.innerText)); if (a) a.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(1500); info.card = await box(/بيوتي ارتست المتكاملة/);
  await p.screenshot({ path: `${out}/02_bundles.png` });
  await p.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/03_product.png` });
  await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((x) => /إضافة للسلة/.test(x.innerText) && x.getBoundingClientRect().width > 120); if (bt) bt.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(800); info.add = await box(/إضافة للسلة/);
  await p.screenshot({ path: `${out}/04_add.png` });
  fs.writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1)); console.log(JSON.stringify(info));
  await b.close();
})();
