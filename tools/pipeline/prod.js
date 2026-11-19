const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const out = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.goto('https://karaduo.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(4000);
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a')].filter(a => /إضاءة جسم|اضاءة جسم|Body Glow|بينك جلام|رويال/i.test(a.innerText + a.getAttribute('aria-label') + (a.querySelector('img')?.alt || ''))).map(a => a.href))]);
  console.log('LINKS', links.join('\n'));
  let i = 0;
  for (const u of links.filter(u => /products?\//.test(u)).slice(0, 4)) {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
    const txt = await p.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
    fs.writeFileSync(`${out}/prod_${i}.txt`, u + '\n' + txt);
    await p.screenshot({ path: `${out}/prod_${i}.png`, fullPage: false });
    const imgs = await p.evaluate(() => [...document.images].map(im => im.currentSrc || im.src).filter(s => /media\.zid|img\.zid/.test(s)));
    fs.writeFileSync(`${out}/prod_${i}_imgs.txt`, imgs.join('\n')); i++;
  }
  await b.close();
})();
