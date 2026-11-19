# python3 -I frames2mp4.py LOG.json KEY(mainFrames|friendFrames) OUT.mp4 [fps]
# Turns screencast frames (variable timing) into a constant-fps H.264 video; prints the wall-clock t of frame 0.
import sys, json, os, subprocess
log = json.load(open(sys.argv[1])); frames = log[sys.argv[2]]; out = sys.argv[3]; fps = sys.argv[4] if len(sys.argv) > 4 else '30'
base = os.path.dirname(os.path.abspath(sys.argv[1]))
lst = out + '.txt'
with open(lst, 'w') as f:
    for i, (ts, fn) in enumerate(frames):
        p = fn if os.path.isabs(fn) else os.path.join(base, '..', fn)
        p = os.path.abspath(p)
        d = (frames[i + 1][0] - ts) if i + 1 < len(frames) else 1.0
        f.write(f"file '{p}'\nduration {max(d, 0.001):.4f}\n")
    f.write(f"file '{p}'\n")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps={fps},scale=780:1688:force_original_aspect_ratio=decrease,pad=780:1688:(ow-iw)/2:(oh-ih)/2:color=0xF6F1F7',
                '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out], check=True)
print('frame0_ts', frames[0][0], 'duration', frames[-1][0] - frames[0][0])
