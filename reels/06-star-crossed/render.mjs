// node render.mjs --stills 0.5,2,5      -> out/still_<t>.png + out/contact.png
// node render.mjs --fps 30 [--from 0 --to 30] -> out/silent.mp4 ; then mux with out/mix.wav -> out/final.mp4
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
mkdirSync('out', { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto(pathToFileURL(resolve(arg('page', 'index.html'))).href);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

const shot = async (t, type = 'png') => { await page.evaluate((t) => window.seek(t), t); return page.locator('#c').screenshot({ type, ...(type === 'jpeg' ? { quality: 95 } : {}) }); };

if (arg('stills')) {
  const ts = arg('stills').split(',').map(Number), files = [];
  for (const t of ts) { const f = `out/still_${t.toFixed(2)}.png`; writeFileSync(f, await shot(t)); files.push(f); }
  const cols = Math.min(6, ts.length), rows = Math.ceil(ts.length / cols);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
    files.map((_, i) => `[${i}:v]scale=270:480,drawtext=text='${ts[i].toFixed(2)}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';') + ';' +
    files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|')}:fill=black`,
    'out/contact.png']);
  console.log('contact -> out/contact.png');
} else {
  const FPS = Number(arg('fps', 30)), from = Number(arg('from', 0)), to = Number(arg('to', 37.5));
  const out = arg('out', 'out/silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round((to - from) * FPS), t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const img = await shot(from + i / FPS, 'jpeg');
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % FPS === 0) process.stdout.write(`\r${(i / FPS).toFixed(0)}s / ${(to - from)}s  (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log(`\ndone -> ${out}`);
}
await browser.close();
