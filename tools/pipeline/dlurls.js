// node dlurls.js OUT_DIR name=url ... -> opens each image URL in the browser and saves the response body
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , out, ...pairs] = process.argv; const b = await chromium.launch(); const p = await b.newPage();
  for (const pr of pairs) { const i = pr.indexOf('='), name = pr.slice(0, i), url = pr.slice(i + 1);
    const r = await p.goto(url, { timeout: 60000 }).catch((e) => null); if (!r) { console.log(name, 'fail'); continue; }
    const buf = await r.body(); const ct = r.headers()['content-type'] || ''; const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    fs.writeFileSync(`${out}/${name}.${ext}`, buf); console.log(name, buf.length, ct); }
  await b.close();
})();
