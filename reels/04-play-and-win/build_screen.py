# python3 -I build_screen.py long|short  -> out/screen_<v>.mp4 (the phone-screen montage, 520x1126, 30fps)
# EDL row: [source, in, out, speed, hold_after, dst_start]
import json, subprocess, sys
v = sys.argv[1]; edl = json.load(open('edl.json'))[v]
src = {'main': 'footage/main.mp4', 'friend': 'footage/friend.mp4'}
W, H = 520, 1126
parts, inputs = [], []
for i, (s, a, b, sp, hold, _) in enumerate(edl):
    inputs += ['-i', src[s]]
    f = f'[{i}:v]trim={a}:{b},setpts=(PTS-STARTPTS)/{sp},fps=30,scale={W}:{H}:flags=lanczos'
    if hold > 0: f += f',tpad=stop_mode=clone:stop_duration={hold}'
    parts.append(f + f',setsar=1[c{i}]')
fc = ';'.join(parts) + ';' + ''.join(f'[c{i}]' for i in range(len(edl))) + f'concat=n={len(edl)}:v=1:a=0[v]'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', fc, '-map', '[v]', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', f'out/screen_{v}.mp4'], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'out/screen_{v}.mp4'], capture_output=True, text=True).stdout.strip())
