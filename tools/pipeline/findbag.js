// node findbag.js OUT_DIR -> finds the makeup bag product page(s), saves text + screenshot
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const out = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.goto('https://karaduo.com/categories/1397956/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(4000);
  for (let y = 0; y < 6000; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(250); }
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a')].filter((a) => /شنط|حقيب|bag|Beauty Artist/i.test(a.innerText + ' ' + (a.querySelector('img')?.alt || ''))).map((a) => a.href))]);
  console.log(links.join('\n'));
  let i = 0;
  for (const u of links.filter((u) => /products\//.test(u)).slice(0, 4)) {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(3500);
    fs.writeFileSync(`${out}/bag_${i}.txt`, u + '\n' + await p.evaluate(() => document.body.innerText));
    await p.screenshot({ path: `${out}/bag_${i}.png` }); i++;
  }
  await b.close();
})();
