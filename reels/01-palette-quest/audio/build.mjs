// node audio/build.mjs   (run from the reel folder)
// -> audio/vo.wav (placed voice lines), audio/music.wav (120 BPM chiptune), audio/sfx.wav, env.js (mouth envelope), out/mix.wav
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TL = JSON.parse(readFileSync('timeline.json', 'utf8'));
const SR = 48000, DUR = TL.dur, N = Math.ceil(DUR * SR);
const ff = (args, input) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { input, maxBuffer: 1 << 30 });

// ---------- 1. voice: cut each line and place it on the timeline ----------
{
  const parts = TL.vo_segments.map(([s, e, d], i) =>
    `[0:a]atrim=${s}:${e},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(e - s - 0.06).toFixed(3)}:d=0.06,adelay=${Math.round(d * 1000)}:all=1[v${i}]`);
  const mix = TL.vo_segments.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${TL.vo_segments.length}:normalize=0,apad=whole_dur=${DUR},atrim=0:${DUR}[vo]`;
  ff(['-i', TL.vo_src, '-filter_complex', parts.join(';') + ';' + mix, '-map', '[vo]', '-ar', SR, '-ac', '1', 'audio/vo.wav']);
}

// ---------- 2. mouth envelope for lip flap (60 per second) ----------
{
  const raw = ff(['-i', 'audio/vo.wav', '-f', 'f32le', '-ac', '1', '-ar', SR, '-']);
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const hop = SR / 60, env = [];
  for (let i = 0; i * hop < x.length; i++) {
    let s = 0; const a = Math.floor(i * hop), b = Math.min(x.length, Math.floor((i + 1) * hop));
    for (let j = a; j < b; j++) s += x[j] * x[j];
    env.push(+Math.sqrt(s / Math.max(1, b - a)).toFixed(4));
  }
  const peak = Math.max(...env);
  writeFileSync('env.js', `window.VO_ENV=${JSON.stringify(env.map((v) => +(v / peak).toFixed(3)))};\n`);
}

// ---------- shared synth helpers (deterministic) ----------
let seed = 1234567;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
const sq = (ph, duty = 0.5) => ((ph % 1) < duty ? 1 : -1);
const tri = (ph) => 1 - 4 * Math.abs((ph % 1) - 0.5);
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
function add(buf, start, len, fn) {
  const s0 = Math.floor(start * SR);
  for (let i = 0; i < len * SR; i++) { const k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += fn(i / SR); }
}
function writeWav(path, chans) {
  const n = chans[0].length, c = chans.length, b = Buffer.alloc(44 + n * 2 * c);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2 * c, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(c, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2 * c, 28);
  b.writeUInt16LE(2 * c, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2 * c, 40);
  for (let i = 0; i < n; i++) for (let ch = 0; ch < c; ch++)
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, chans[ch][i])) * 32767), 44 + (i * c + ch) * 2);
  writeFileSync(path, b);
}

// ---------- 3. music: soft chiptune, 120 BPM, Fmaj7 - Em7 - Dm7 - Cmaj7 ----------
{
  const M = new Float32Array(N), L = new Float32Array(N), R = new Float32Array(N), beat = 60 / TL.bpm;
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const END = 25.2;                                   // band stops at the lockup, then a chime
  for (let b = 0; b * beat < END; b++) {
    const t = b * beat, bar = Math.floor(b / 4), ch = chords[bar % 4], intro = t < 1.8;
    // kick on 1 and 3, snare on 2 and 4
    if (!intro || b % 4 === 0) add(M, t, 0.3, (x) => Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 11) * (b % 2 === 0 ? 0.55 : 0));
    if (!intro && b % 2 === 1) add(M, t, 0.18, (x) => noise() * Math.exp(-x * 22) * 0.22);
    // hats on 8ths
    if (!intro) for (const h of [0, 0.5]) add(M, t + h * beat, 0.04, (x) => noise() * Math.exp(-x * 120) * 0.08);
    // bass: root on 8ths, triangle
    const root = ch[0] - 12;
    for (const h of [0, 0.5]) add(M, t + h * beat, beat * 0.45, (x) => tri(mtof(root + (h ? 12 : 0)) * x) * Math.min(1, x * 200) * Math.exp(-x * 4) * 0.22);
    // arp: 16ths, 25% pulse, panned
    if (!intro) for (let s = 0; s < 4; s++) {
      const note = ch[(b * 4 + s) % 4] + 12, pan = s % 2 ? 0.7 : 0.3;
      add(R, t + s * beat / 4, beat / 4 * 0.9, (x) => sq(mtof(note) * x, 0.25) * Math.exp(-x * 14) * 0.05 * pan * 2);
      add(L, t + s * beat / 4, beat / 4 * 0.9, (x) => sq(mtof(note) * x, 0.25) * Math.exp(-x * 14) * 0.05 * (1 - pan) * 2);
    }
  }
  // drop: one bright chime + warm pad under the lockup
  [72, 76, 79, 84].forEach((m, i) => add(M, END + i * 0.06, 2.5, (x) => sq(mtof(m) * x, 0.5) * Math.exp(-x * 2.2) * 0.05));
  [53, 57, 60, 64].forEach((m) => add(M, END + 0.2, DUR - END, (x) => tri(mtof(m) * x) * Math.min(1, x * 1.5) * Math.min(1, (DUR - END - 0.2 - x) * 1.2) * 0.06));
  for (let i = 0; i < N; i++) { L[i] += M[i]; R[i] += M[i]; }
  writeWav('audio/music.wav', [L, R]);
}

// ---------- 4. sfx ----------
{
  const B = new Float32Array(N);
  const V = {
    blip:   [0.09, (x) => sq((880 + (x < 0.04 ? 0 : 440)) * x) * Math.exp(-x * 30) * 0.18],
    pop:    [0.12, (x) => Math.sin(2 * Math.PI * (500 + 1400 * x) * x) * Math.exp(-x * 32) * 0.45],
    thump:  [0.45, (x) => Math.sin(2 * Math.PI * (95 - 55 * x) * x) * Math.exp(-x * 9) * 0.8],
    whoosh: [0.32, (x) => noise() * Math.sin(Math.PI * Math.min(1, x / 0.32)) * 0.22],
    click:  [0.05, (x) => Math.sin(2 * Math.PI * 1900 * x) * Math.exp(-x * 90) * 0.35],
    type:   [0.04, (x) => (noise() * 0.5 + Math.sin(2 * Math.PI * 2600 * x)) * Math.exp(-x * 140) * 0.22],
    tick:   [0.06, (x) => sq(1320 * x) * Math.exp(-x * 60) * 0.12],
    coin:   [0.35, (x) => sq((x < 0.07 ? 988 : 1319) * x) * Math.exp(-x * 7) * 0.14],
    star:   [0.2, (x) => sq(1568 * x * (1 + x)) * Math.exp(-x * 16) * 0.13],
    sparkle:[0.5, (x) => [2093, 2637, 3136].reduce((s, f, i) => s + (x > i * 0.05 ? Math.sin(2 * Math.PI * f * x) * Math.exp(-(x - i * 0.05) * 9) : 0), 0) * 0.08],
    jingle: [0.6, (x) => { const n = [72, 76, 79, 84][Math.min(3, Math.floor(x / 0.09))]; return sq(mtof(n) * x, 0.25) * Math.exp(-(x % 0.09) * 8) * 0.12; }],
    burst:  [0.4, (x) => (noise() * Math.exp(-x * 10) * 0.35 + Math.sin(2 * Math.PI * 70 * x) * Math.exp(-x * 12) * 0.5)],
    vs:     [0.7, (x) => (sq(mtof(64 - 12 * Math.min(1, x * 2.5)) * x) * 0.16 + noise() * 0.12) * Math.exp(-x * 3.5) + Math.sin(2 * Math.PI * (80 - 40 * x) * x) * Math.exp(-x * 7) * 0.6],
    hit:    [0.3, (x) => (noise() * 0.6 + sq(110 * x) * 0.4) * Math.exp(-x * 14) * 0.6],
    stamp:  [0.5, (x) => Math.sin(2 * Math.PI * (70 - 30 * x) * x) * Math.exp(-x * 10) * 0.9 + noise() * Math.exp(-x * 40) * 0.25],
  };
  for (const [t, type] of TL.sfx) { const [len, fn] = V[type]; add(B, t, len, fn); }
  writeWav('audio/sfx.wav', [B]);
}

// ---------- 5. mix: music ducked under voice, loudness -14 LUFS ----------
ff(['-i', 'audio/vo.wav', '-i', 'audio/music.wav', '-i', 'audio/sfx.wav', '-filter_complex',
  '[0:a]asplit=2[vo][sc];[1:a]volume=0.55[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[duck];' +
  '[vo]volume=1.0,aformat=channel_layouts=stereo[v];[2:a]volume=0.8,aformat=channel_layouts=stereo[s];' +
  '[v][duck][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
  '-map', '[a]', '-ar', SR, 'out/mix.wav']);
console.log('audio done: audio/vo.wav audio/music.wav audio/sfx.wav out/mix.wav env.js');
