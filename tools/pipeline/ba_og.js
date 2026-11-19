// node ba_og.js URLS_TXT OUT_DIR -> downloads each page's og:image (main product photo) at full size
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [, , list, out] = process.argv; const rows = fs.readFileSync(list, 'utf8').trim().split('\n').map((l) => l.split(' '));
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  for (const [key, url] of rows) {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    const og = await p.evaluate(() => (document.querySelector('meta[property="og:image"]') || {}).content || null);
    if (!og) { console.log(key, 'no og'); continue; }
    const img = await p.evaluate(async (u) => { const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const x of b) s += String.fromCharCode(x); return { ct: r.headers.get('content-type'), b64: btoa(s) }; }, og).catch(() => null);
    if (!img) { console.log(key, 'fetch fail', og); continue; }
    const ext = /png/.test(img.ct) ? 'png' : /webp/.test(img.ct) ? 'webp' : 'jpg';
    fs.writeFileSync(`${out}/${key}.${ext}`, Buffer.from(img.b64, 'base64')); console.log(key, og.slice(-50));
  }
  await b.close();
})();
