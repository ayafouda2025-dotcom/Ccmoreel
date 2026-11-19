// node orderflow.js OUT_DIR PRODUCT_URL -> 430x932 phone screenshots of the real ordering path + button boxes
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, productUrl] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const info = {};
  const settle = async () => { await p.waitForTimeout(3500); };
  const box = async (sel) => { const el = await p.$(sel); if (!el) return null; await el.scrollIntoViewIfNeeded().catch(() => {}); const bb = await el.boundingBox(); return bb; };
  // 1 home
  await p.goto('https://karaduo.com/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle();
  await p.screenshot({ path: `${out}/01_home.png` });
  info.homeBundles = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => x.innerText.trim() === 'البكجات' && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().top > 0);
    if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, href: a.href }; });
  // 2 bundles category
  if (info.homeBundles?.href) { await p.goto(info.homeBundles.href, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle();
    await p.screenshot({ path: `${out}/02_bundles.png` });
    info.bundlesCard = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /إضاءة جسم ووجه سائلة مع فرشاة/.test(x.innerText) && x.getBoundingClientRect().width > 0);
      if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }); }
  // 3 product page
  await p.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle();
  await p.screenshot({ path: `${out}/03_product.png` });
  info.addBtn = await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((x) => /إضافة للسلة|أضف للسلة|اضف للسلة/.test(x.innerText) && x.getBoundingClientRect().width > 120);
    if (!bt) return null; bt.scrollIntoView({ block: 'center' }); const r = bt.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, text: bt.innerText.trim() }; });
  await p.waitForTimeout(800); await p.screenshot({ path: `${out}/04_addtocart.png` });
  info.addBtn2 = await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((x) => /إضافة للسلة|أضف للسلة|اضف للسلة/.test(x.innerText) && x.getBoundingClientRect().width > 120);
    if (!bt) return null; const r = bt.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  fs.writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1)); console.log(JSON.stringify(info));
  await b.close();
})();
