// node audio/build.mjs long|short -> out/mix_<v>.wav  (soft synthesized music + Nouf VO (long only) + light SFX, -14 LUFS)
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const V = process.argv[2] || 'long', SR = 48000;
const DUR = 37.5, N = Math.ceil(DUR * SR);
const ff = (a, input) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { input, maxBuffer: 1 << 30 });

// VO lines: [src_start, src_end, dst_start] in audio/vo_a.mp3
const F = 'audio/vo.mp3';
const VO = [[0.0, 2.5, 1.2, F], [3.0, 7.95, 4.6, F], [8.0, 8.85, 10.2, F], [9.0, 9.85, 12.0, F], [10.0, 10.95, 13.8, F], [11.3, 13.25, 15.6, F], [13.3, 18.95, 18.2, F], [19.05, 24.35, 24.8, F], [24.5, 27.8, 31.0, F]];
const SFX = [[0.2, 'swish'], [1.15, 'chime'], [1.2, 'sparkle'], [1.25, 'sparkle'], [2.7, 'sparkle'], [4.4, 'chime'], [4.5, 'swish'], [7.1, 'pop'], [8.3, 'sparkle'],
  [9.9, 'swish'], [10.25, 'sparkle'], [11.2, 'sparkle'], [12.0, 'swish'], [12.05, 'sparkle'], [13.0, 'sparkle'], [13.8, 'swish'], [13.85, 'sparkle'], [14.8, 'sparkle'],
  [15.5, 'chime'], [16.4, 'swish'], [16.6, 'sparkle'], [18.1, 'swish'], [19.54, 'sparkle'], [20.58, 'sparkle'], [21.7, 'sparkle'], [22.58, 'sparkle'], [23.4, 'chime'],
  [24.7, 'swish'], [26.8, 'tap'], [27.3, 'tap'], [27.95, 'tap'], [28.95, 'tap'], [29.0, 'coin'], [29.9, 'pop'],
  [30.9, 'chime'], [31.0, 'swish'], [31.95, 'sparkle'], [32.0, 'chime'], [33.6, 'sparkle'], [34.5, 'pop'], [35.6, 'tap'], [35.65, 'sparkle']];
let seed = 7; const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (b, s, len, fn) => { const s0 = Math.floor(s * SR); for (let i = 0; i < len * SR; i++) { const k = s0 + i; if (k >= 0 && k < b.length) b[k] += fn(i / SR); } };
function wav(path, ch) { const n = ch[0].length, c = ch.length, b = Buffer.alloc(44 + n * 2 * c);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2 * c, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(c, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2 * c, 28); b.writeUInt16LE(2 * c, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2 * c, 40);
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, ch[k][i])) * 32767), 44 + (i * c + k) * 2); writeFileSync(path, b); }

// ---------- soft pop music, 100 BPM: Fmaj7 – Am7 – Dm7 – Bbmaj7 ----------
{
  const L = new Float32Array(N), R = new Float32Array(N), beat = 60 / 76, END = DUR - 2.2;
  const CH = [[53, 57, 60, 64], [50, 53, 57, 62], [58, 62, 65, 69], [55, 59, 62, 65]];
  const pluck = (f, a) => (x) => (Math.sin(2 * Math.PI * f * x) + 0.35 * Math.sin(4 * Math.PI * f * x) * Math.exp(-x * 9)) * Math.exp(-x * 5.5) * a;
  for (let b = 0; b * beat < END; b++) {
    const t = b * beat, ch = CH[Math.floor(b / 4) % 4];
    if (b % 4 === 0) ch.forEach((m, i) => { const f = mtof(m); add(L, t, beat * 4, (x) => Math.sin(2 * Math.PI * f * 0.999 * x) * Math.min(1, x * 3) * Math.min(1, (beat * 4 - x) * 3) * 0.022); add(R, t, beat * 4, (x) => Math.sin(2 * Math.PI * f * 1.001 * x) * Math.min(1, x * 3) * Math.min(1, (beat * 4 - x) * 3) * 0.022); });
    add(L, t, beat, (x) => Math.sin(2 * Math.PI * mtof(ch[0] - 12) * x) * Math.min(1, x * 80) * Math.exp(-x * 3) * 0.16); add(R, t, beat, (x) => Math.sin(2 * Math.PI * mtof(ch[0] - 12) * x) * Math.min(1, x * 80) * Math.exp(-x * 3) * 0.16);
    if (b % 2 === 0) { const k = (x) => Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-x * 35)) * x) * Math.exp(-x * 10) * 0.42; add(L, t, 0.3, k); add(R, t, 0.3, k); }
    if (b % 4 === 1 || b % 4 === 3) { const c = (x) => noise() * Math.exp(-x * 26) * 0.12; add(L, t, 0.15, c); add(R, t, 0.15, c); }
    for (const h of [0.5]) { const s = (x) => noise() * Math.exp(-x * 90) * 0.05; add(L, t + h * beat, 0.05, s); add(R, t + h * beat, 0.05, s); }
    for (let s = 0; s < 2; s++) { const m = ch[(b * 2 + s) % 4] + 12, pan = s ? 0.7 : 0.3; add(L, t + s * beat / 2, 0.6, pluck(mtof(m), 0.06 * (1 - pan) * 2)); add(R, t + s * beat / 2, 0.6, pluck(mtof(m), 0.06 * pan * 2)); }
  }
  [65, 69, 72, 76, 79].forEach((m, i) => { add(L, END + i * 0.07, 2.6, pluck(mtof(m), 0.07)); add(R, END + i * 0.07, 2.6, pluck(mtof(m), 0.07)); });
  wav('audio/music.wav', [L, R]);
}
// ---------- SFX ----------
{
  const B = new Float32Array(N);
  const S = {
    swish: [0.32, (x) => noise() * Math.sin(Math.PI * Math.min(1, x / 0.32)) * 0.12],
    tap: [0.06, (x) => Math.sin(2 * Math.PI * 1500 * x) * Math.exp(-x * 80) * 0.25],
    tick: [0.08, (x) => Math.sin(2 * Math.PI * 900 * x) * Math.exp(-x * 50) * 0.2],
    pop: [0.12, (x) => Math.sin(2 * Math.PI * (500 + 1200 * x) * x) * Math.exp(-x * 30) * 0.3],
    coin: [0.4, (x) => (Math.sin(2 * Math.PI * (x < 0.08 ? 1319 : 1760) * x)) * Math.exp(-x * 7) * 0.18],
    sparkle: [0.6, (x) => [2093, 2637, 3136, 4186].reduce((s, f, i) => s + (x > i * 0.05 ? Math.sin(2 * Math.PI * f * x) * Math.exp(-(x - i * 0.05) * 8) : 0), 0) * 0.06],
    chime: [1.2, (x) => [72, 76, 79, 84].reduce((s, m, i) => s + (x > i * 0.06 ? Math.sin(2 * Math.PI * mtof(m) * x) * Math.exp(-(x - i * 0.06) * 3) : 0), 0) * 0.08],
  };
  for (const [t, k] of SFX) { const [len, fn] = S[k]; add(B, t, len, fn); }
  wav('audio/sfx.wav', [B]);
}
// ---------- mix ----------
if (VO.length) {
  const srcs = [...new Set(VO.map((v) => v[3]))];
  const parts = VO.map(([s, e, d, f], i) => `[${srcs.indexOf(f)}:a]aresample=${SR},atrim=${s}:${e},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(e - s - 0.05).toFixed(3)}:d=0.05,adelay=${Math.round(d * 1000)}:all=1[v${i}]`);
  ff([...srcs.flatMap((f) => ['-i', f]), '-filter_complex', parts.join(';') + ';' + VO.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${VO.length}:normalize=0,apad=whole_dur=${DUR},atrim=0:${DUR}[vo]`, '-map', '[vo]', '-ar', SR, '-ac', '1', 'audio/vo.wav']);
  ff(['-i', 'audio/vo.wav', '-i', 'audio/music.wav', '-i', 'audio/sfx.wav', '-filter_complex',
    '[0:a]asplit=2[vo][sc];[1:a]volume=0.32[mu];[mu][sc]sidechaincompress=threshold=0.02:ratio=10:attack=10:release=300[duck];[vo]volume=1.3,aformat=channel_layouts=stereo[v];[2:a]volume=0.7,aformat=channel_layouts=stereo[s];[v][duck][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
    '-map', '[a]', '-ar', SR, 'out/mix.wav']);
} else {
  ff(['-i', 'audio/music.wav', '-i', 'audio/sfx.wav', '-filter_complex', '[0:a]volume=0.9[m];[1:a]volume=0.8,aformat=channel_layouts=stereo[s];[m][s]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]', '-map', '[a]', '-ar', SR, `out/mix_${V}.wav`]);
}
console.log('audio ->', `out/mix_${V}.wav`);
