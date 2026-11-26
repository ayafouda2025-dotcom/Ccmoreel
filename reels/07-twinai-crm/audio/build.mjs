// node audio/build.mjs -> out/mix.wav  (synth tech-corporate bed + Nouf VO + UI SFX, ducked, -14 LUFS)
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const SR = 48000, DUR = 76.5, N = Math.ceil(DUR * SR);
const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { maxBuffer: 1 << 30 });
const F = 'audio/vo_a.mp3';
const SEG = [[0.10, 5.95, 0.6], [6.25, 13.40, 7.0], [13.60, 16.58, 15.2], [16.75, 24.18, 19.0], [24.38, 31.22, 27.2], [31.22, 38.36, 34.8],
  [38.36, 45.80, 42.7], [45.80, 52.93, 51.1], [52.93, 58.28, 59.2], [58.28, 61.80, 65.3], [61.80, 65.50, 69.8]];
const V = (s) => { for (const [a, b, d] of SEG) if (s < b) return s >= a ? d + s - a : d - Math.min(0.3, a - s); return s; };
const STG = [27.76, 28.4, 29.0, 29.6, 30.4].map(V);
const SFX = [
  [V(0.53), 'tick'], [V(1.84), 'ding'], [V(4.72), 'thud'],
  [6.8, 'swish'], [V(6.6), 'pop'], [V(6.95), 'pop'], [V(7.3), 'pop'], [V(8.48), 'paper'], [V(9.0), 'paper'], [V(12.36), 'error'],
  [14.6, 'swish'], [V(13.9), 'rise'], [V(14.0), 'boom'], [V(14.05), 'chime'], [V(14.72), 'tick'],
  [18.4, 'swish'], [V(16.9), 'pop'], [V(19.2), 'msg'], [V(20.16), 'msg'], [V(21.12), 'msg'], [V(21.68), 'msg'], [V(21.44), 'sparkle'], [V(22.32), 'tick'],
  [V(24.3) + 0.2, 'swish'], [V(25.84), 'tick'], [V(26.48), 'tick'], [V(27.12), 'tick'], ...STG.map((t) => [t, 'ding']), [V(29.3), 'sparkle'],
  [V(31.22) + 0.2, 'swish'], [V(31.28), 'pop'], [V(32.72), 'success'], [V(33.36), 'pop'], [V(34.0), 'tick'], [V(34.56), 'bell'], [V(36.24), 'pop'], [V(37.52), 'tick'],
  [V(38.3) + 0.2, 'swish'], [V(38.8), 'pop'], [V(39.0), 'pop'], [V(39.2), 'pop'], [V(40.0), 'tick'], [V(42.93), 'tick'], [V(43.7), 'tick'], [V(44.4), 'rise'],
  [50.6, 'swish'], [V(46.28), 'pop'], [V(47.7), 'pop'], [V(48.96), 'pop'], [V(49.8), 'pop'], [V(50.4), 'ding'], [V(51.6), 'chime'], [V(51.8), 'sparkle'],
  [58.8, 'swish'], [V(52.96), 'tick'], [V(54.32), 'pop'], [V(55.36), 'pop'], [V(56.56), 'pop'],
  [65.0, 'swish'], [V(59.68), 'lock'], [V(59.12), 'tick'], [V(60.32), 'tick'],
  [69.4, 'swish'], [69.6, 'rise'], [V(61.84), 'boom'], [V(61.86), 'chime'], [V(63.2), 'sparkle'],
];
let seed = 7; const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (b, s, len, fn) => { const s0 = Math.floor(s * SR); for (let i = 0; i < len * SR; i++) { const k = s0 + i; if (k >= 0 && k < b.length) b[k] += fn(i / SR); } };
function wav(path, ch) { const n = ch[0].length, c = ch.length, b = Buffer.alloc(44 + n * 2 * c);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2 * c, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(c, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2 * c, 28); b.writeUInt16LE(2 * c, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2 * c, 40);
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, ch[k][i])) * 32767), 44 + (i * c + k) * 2); writeFileSync(path, b); }

// ---------- music: 104 BPM, Am – F – C – G; sparse/dark until the reveal at 14.6 ----------
{
  const L = new Float32Array(N), R = new Float32Array(N), beat = 60 / 104, END = DUR - 2.0, DROP = 14.6;
  const CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]];
  const pluck = (f, a) => (x) => (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(4 * Math.PI * f * x) * Math.exp(-x * 10)) * Math.exp(-x * 6) * a;
  for (let b = 0; b * beat < END; b++) {
    const t = b * beat, ch = CH[Math.floor(b / 4) % 4], full = t >= DROP, inEnd = t > 69.4;
    if (b % 4 === 0) ch.forEach((m) => { const f = mtof(m), len = beat * 4, a = full ? 0.02 : 0.026;
      add(L, t, len, (x) => Math.sin(2 * Math.PI * f * 0.998 * x) * Math.min(1, x * 2) * Math.min(1, (len - x) * 3) * a);
      add(R, t, len, (x) => Math.sin(2 * Math.PI * f * 1.002 * x) * Math.min(1, x * 2) * Math.min(1, (len - x) * 3) * a); });
    // soft heartbeat pulse in the hook
    if (!full && b % 2 === 0) { const k = (x) => Math.sin(2 * Math.PI * (48 + 40 * Math.exp(-x * 30)) * x) * Math.exp(-x * 9) * 0.25; add(L, t, 0.3, k); add(R, t, 0.3, k); }
    if (full) {
      const bass = (x) => Math.sin(2 * Math.PI * mtof(ch[0] - 24) * x) * Math.min(1, x * 60) * Math.exp(-x * 2.5) * 0.17;
      add(L, t, beat, bass); add(R, t, beat, bass);
      if (!inEnd || b % 4 === 0) { const k = (x) => Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-x * 35)) * x) * Math.exp(-x * 9) * 0.4; if (b % 2 === 0) { add(L, t, 0.3, k); add(R, t, 0.3, k); } }
      if (!inEnd && b % 4 === 2) { const c = (x) => noise() * Math.exp(-x * 22) * 0.1; add(L, t, 0.18, c); add(R, t, 0.18, c); }
      for (const h of [0.5]) { const s = (x) => noise() * Math.exp(-x * 110) * 0.045; add(L, t + h * beat, 0.05, s); add(R, t + h * beat, 0.05, s); }
      for (let s = 0; s < 2; s++) { const m = ch[(b * 2 + s) % 4] + 12, pan = s ? 0.72 : 0.28; add(L, t + s * beat / 2, 0.5, pluck(mtof(m), 0.05 * (1 - pan) * 2)); add(R, t + s * beat / 2, 0.5, pluck(mtof(m), 0.05 * pan * 2)); }
    } else if (b % 2 === 1) { const m = ch[b % 4] + 12; add(L, t, 0.9, pluck(mtof(m), 0.035)); add(R, t + 0.12, 0.9, pluck(mtof(m), 0.035)); }
  }
  [69, 72, 76, 79, 84].forEach((m, i) => { add(L, END + i * 0.08, 2.4, pluck(mtof(m), 0.06)); add(R, END + i * 0.08, 2.4, pluck(mtof(m), 0.06)); });
  wav('audio/music.wav', [L, R]);
}
// ---------- SFX ----------
{
  const B = new Float32Array(N);
  const S = {
    swish: [0.4, (x) => noise() * Math.sin(Math.PI * Math.min(1, x / 0.4)) * 0.13],
    tick: [0.06, (x) => Math.sin(2 * Math.PI * 1800 * x) * Math.exp(-x * 90) * 0.22],
    pop: [0.12, (x) => Math.sin(2 * Math.PI * (500 + 1300 * x) * x) * Math.exp(-x * 32) * 0.28],
    msg: [0.25, (x) => (Math.sin(2 * Math.PI * (x < 0.07 ? 988 : 1319) * x)) * Math.exp(-x * 14) * 0.2],
    ding: [0.7, (x) => (Math.sin(2 * Math.PI * 1568 * x) + 0.4 * Math.sin(2 * Math.PI * 3136 * x)) * Math.exp(-x * 6) * 0.13],
    thud: [0.35, (x) => Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-x * 20)) * x) * Math.exp(-x * 10) * 0.5 + noise() * Math.exp(-x * 40) * 0.08],
    paper: [0.3, (x) => noise() * Math.exp(-x * 12) * Math.sin(x * 90) * 0.12],
    error: [0.45, (x) => (Math.sin(2 * Math.PI * (x < 0.18 ? 311 : 233) * x) > 0 ? 1 : -1) * Math.exp(-((x % 0.2)) * 8) * 0.07],
    success: [0.6, (x) => [784, 988, 1175].reduce((s, f, i) => s + (x > i * 0.07 ? Math.sin(2 * Math.PI * f * x) * Math.exp(-(x - i * 0.07) * 7) : 0), 0) * 0.12],
    bell: [1.0, (x) => (Math.sin(2 * Math.PI * 1320 * x) + 0.5 * Math.sin(2 * Math.PI * 1980 * x)) * Math.exp(-x * 4) * (0.7 + 0.3 * Math.sin(x * 60)) * 0.1],
    lock: [0.2, (x) => (noise() * Math.exp(-x * 70) * 0.25 + Math.sin(2 * Math.PI * 900 * x) * Math.exp(-x * 50) * 0.2) + (x > 0.08 ? Math.sin(2 * Math.PI * 600 * x) * Math.exp(-(x - 0.08) * 50) * 0.2 : 0)],
    rise: [0.9, (x) => noise() * (x / 0.9) ** 2 * 0.09 + Math.sin(2 * Math.PI * (300 + 900 * x) * x) * (x / 0.9) ** 3 * 0.03],
    boom: [1.6, (x) => Math.sin(2 * Math.PI * (45 + 50 * Math.exp(-x * 6)) * x) * Math.exp(-x * 2.2) * 0.45],
    sparkle: [0.6, (x) => [2093, 2637, 3136, 4186].reduce((s, f, i) => s + (x > i * 0.05 ? Math.sin(2 * Math.PI * f * x) * Math.exp(-(x - i * 0.05) * 8) : 0), 0) * 0.05],
    chime: [1.4, (x) => [69, 73, 76, 81].reduce((s, m, i) => s + (x > i * 0.06 ? Math.sin(2 * Math.PI * mtof(m) * x) * Math.exp(-(x - i * 0.06) * 2.8) : 0), 0) * 0.08],
  };
  for (const [t, k] of SFX) { const [len, fn] = S[k]; add(B, t, len, fn); }
  wav('audio/sfx.wav', [B]);
}
// ---------- mix ----------
const parts = SEG.map(([s, e, d], i) => `[0:a]aresample=${SR},atrim=${s}:${e},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${(e - s - 0.06).toFixed(3)}:d=0.06,adelay=${Math.round(d * 1000)}:all=1[v${i}]`);
ff(['-i', F, '-filter_complex', parts.join(';') + ';' + SEG.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${SEG.length}:normalize=0,apad=whole_dur=${DUR},atrim=0:${DUR}[vo]`, '-map', '[vo]', '-ar', SR, '-ac', '1', 'audio/vo.wav']);
ff(['-i', 'audio/vo.wav', '-i', 'audio/music.wav', '-i', 'audio/sfx.wav', '-filter_complex',
  '[0:a]asplit=2[vo][sc];[1:a]volume=0.34[mu];[mu][sc]sidechaincompress=threshold=0.02:ratio=10:attack=10:release=350[duck];[vo]volume=1.35,aformat=channel_layouts=stereo[v];[2:a]volume=0.65,aformat=channel_layouts=stereo[s];[v][duck][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
  '-map', '[a]', '-ar', SR, 'out/mix.wav']);
console.log('audio -> out/mix.wav');
