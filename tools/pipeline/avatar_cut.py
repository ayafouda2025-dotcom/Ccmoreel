# python3 -I avatar_cut.py SHEET.png OUT_DIR
# Cuts every figure off a character sheet with a purple panel background (expressions row, walk cycle, front pose).
import sys, os, numpy as np
from collections import deque
from PIL import Image

sheet, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
A = np.asarray(Image.open(sheet).convert('RGB')).astype(int)

def bgmask(a):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    purple = (R > G + 10) & (B > G + 14) & (R < 178) & (B < 190) & (G < 135) & (R > 70)
    lilac = (B > G + 20) & (R > G + 8) & (B < 240) & (R > 120)          # light panel borders
    return purple | lilac

def segments(prof, thr, minw):
    segs, inside = [], False
    for x, v in enumerate(prof):
        if v > thr and not inside: s0, inside = x, True
        elif v <= thr and inside:
            if x - s0 > minw: segs.append((s0, x))
            inside = False
    return segs

def cut(name, box):
    x0, y0, x1, y1 = box; a = A[y0:y1, x0:x1]; bg = bgmask(a)
    m = np.zeros_like(bg); m[0, :] = bg[0, :]; m[-1, :] = bg[-1, :]; m[:, 0] = bg[:, 0]; m[:, -1] = bg[:, -1]
    for _ in range(4000):
        g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; g &= bg
        if (g == m).all(): break
        m = g
    op = ~m
    # keep only the largest connected figure (drops stray bits of neighbours / icons)
    h, w = op.shape; lab = np.zeros((h, w), int); best, bestn, cur = 0, 0, 0
    for sy in range(h):
        for sx in range(w):
            if op[sy, sx] and not lab[sy, sx]:
                cur += 1; q = deque([(sy, sx)]); lab[sy, sx] = cur; n = 0
                while q:
                    y, x = q.popleft(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and op[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; q.append((yy, xx))
                if n > bestn: best, bestn = cur, n
    keep = lab == best
    rgba = np.dstack([a.astype(np.uint8), np.where(keep, 255, 0).astype(np.uint8)])
    im = Image.fromarray(rgba, 'RGBA'); im = im.crop(im.getbbox()); im.save(f'{out}/{name}.png'); print(name, im.size)

bgfull = bgmask(A)
row = segments((~bgfull[603:796]).sum(0), 25, 60)
print('expression columns', row)
names = ['neutral', 'content', 'laugh', 'wink', 'think', 'love', 'drink', 'cool']
for n, (a, b) in zip(names, row): cut('face_' + n, (max(0, a - 12), 603, min(A.shape[1], b + 12), 796))
walk = [s for s in segments((~bgfull[806:1020, 0:540]).sum(0), 15, 40)]
print('walk columns', walk)
for i, (a, b) in enumerate(walk[:4]): cut(f'walk{i}', (max(0, a - 8), 806, b + 8, 1020))
top = segments((~bgfull[0:590]).sum(0), 15, 40)
print('top columns', top)
cut('front', (395, 0, 565, 590))
cut('bust', (0, 0, 382, 588))
