// node render.mjs long|short [--stills 1,5,9]
// Renders the overlay layer with alpha, then composites: background(screen montage in the phone hole) + overlay + audio.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const V = process.argv[2] || 'long'; const si = process.argv.indexOf('--stills');
const FPS = 30; mkdirSync('out', { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(pathToFileURL(resolve('index.html')).href + '?v=' + V);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const DUR = await page.evaluate(() => window.DUR);
const shot = async (t) => { await page.evaluate((t) => window.seek(t), t); return page.locator('#c').screenshot({ type: 'png', omitBackground: true }); };

if (si > 0) {
  // stills: composite a single frame of the screen montage under the overlay for review
  const ts = process.argv[si + 1].split(',').map(Number), files = [];
  for (const t of ts) {
    writeFileSync('out/_ov.png', await shot(t));
    const f = `out/still_${V}_${t.toFixed(2)}.png`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.min(t, DUR - 0.05)), '-i', `out/screen_${V}.mp4`, '-i', 'out/_ov.png', '-filter_complex',
      `color=c=0xF1E6F4:s=1080x1920:d=1[bg];[0:v]scale=520:1126[s];[bg][s]overlay=280:650:shortest=1[b];[b][1:v]overlay=0:0`, '-frames:v', '1', f]);
    files.push(f);
  }
  const cols = Math.min(6, ts.length);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
    files.map((_, i) => `[${i}:v]scale=270:480,drawtext=text='${ts[i].toFixed(2)}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';') + ';' +
    files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|')}:fill=black`, `out/contact_${V}.png`]);
  console.log(`contact -> out/contact_${V}.png`);
} else {
  const ov = `out/overlay_${V}.mov`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'qtrle', '-pix_fmt', 'argb', ov], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(DUR * FPS);
  for (let i = 0; i < total; i++) { const png = await shot(i / FPS); if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r)); if (i % FPS === 0) process.stdout.write(`\r${i / FPS}s / ${DUR.toFixed(1)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  const audio = existsSync(`out/mix_${V}.wav`) ? ['-i', `out/mix_${V}.wav`] : [];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `out/screen_${V}.mp4`, '-i', ov, ...audio, '-filter_complex',
    `color=c=0xF1E6F4:s=1080x1920:r=${FPS}:d=${DUR}[bg];[0:v]scale=520:1126[s];[bg][s]overlay=280:650:shortest=1[b];[b][1:v]overlay=0:0[v]`,
    '-map', '[v]', ...(audio.length ? ['-map', '2:a', '-c:a', 'aac', '-b:a', '192k'] : []), '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', String(DUR), '-movflags', '+faststart', `out/final_${V}.mp4`]);
  console.log(`\ndone -> out/final_${V}.mp4`);
}
await browser.close();
