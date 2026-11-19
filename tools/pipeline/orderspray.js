// node orderspray.js OUT_DIR PRODUCT_URL -> phone screenshots: home (face category), face category with the spray card, product page shade picker (STARRY NIGHT picked), add-to-cart
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, productUrl] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const info = {};
  const rect = (sel) => p.evaluate((src) => { const r = new RegExp(src); const a = [...document.querySelectorAll('a,button,span,div')].filter((x) => r.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().top > 0 && x.getBoundingClientRect().top < 932)
      .sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
    if (!a) return null; const q = a.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, href: a.closest('a') ? a.closest('a').href : null }; }, sel.source);
  await p.goto('https://karaduo.com/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  info.face = await rect(/^الوجه$/); await p.screenshot({ path: `${out}/01_home.png` });
  console.log('face', JSON.stringify(info.face));
  const faceHref = info.face && info.face.href;
  if (faceHref) { await p.goto(faceHref, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
    for (let k = 0; k < 20; k++) { const found = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /ستار كروسد دريمز/.test(x.innerText) && /رذاذ/.test(x.innerText)); if (a) { a.scrollIntoView({ block: 'center' }); return true; } scrollBy(0, 700); return false; }); await p.waitForTimeout(700); if (found) break; }
    await p.waitForTimeout(1200); info.card = await rect(/رذاذ لمعة للوجه والجسم ستار كروسد/); await p.screenshot({ path: `${out}/02_face.png` }); console.log('card', JSON.stringify(info.card)); }
  await p.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/03_product.png` });
  // the shade picker
  await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find((x) => /^الدرجه:?$/.test((x.innerText || '').trim())); if (e) e.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(900); info.picker = await rect(/^الدرجه:?$/); await p.screenshot({ path: `${out}/04_shades.png` });
  info.dots = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.top > 0 && r.top < 932 && r.width > 14 && r.width < 44 && Math.abs(r.width - r.height) < 2 && cs.borderRadius.includes('50') && /rgb\((248, 205, 238|229, 229, 229|247, 212, 132|237, 197, 182)\)/.test(cs.backgroundColor); })
    .map((e) => { const r = e.getBoundingClientRect(); return [getComputedStyle(e).backgroundColor, r.x + r.width / 2, r.y + r.height / 2]; }));
  console.log('dots', JSON.stringify(info.dots));
  // pick the gold dot and record the label change
  const gold = (info.dots || []).find((d) => /247, 212, 132/.test(d[0]));
  if (gold) { await p.mouse.click(gold[1], gold[2]); await p.waitForTimeout(1500); }
  info.label_after = await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find((x) => /^الدرجه:?$/.test((x.innerText || '').trim())); return e && e.parentElement ? e.parentElement.innerText.replace(/\n/g, ' ') : null; });
  await p.screenshot({ path: `${out}/05_picked.png` });
  info.add = await rect(/^إضافة للسلة$/);
  fs.writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1)); console.log(JSON.stringify(info));
  await b.close();
})();
