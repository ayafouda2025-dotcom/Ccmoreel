# python3 -I whitecrop.py OUT_DIR key=path ...  -> OUT_DIR/<key>.jpg cropped tight around the product on its white background
# (drawn later with "multiply" on light backgrounds, so white disappears without cutting out pale products)
import sys, os, numpy as np
from collections import deque
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for arg in sys.argv[2:]:
    key, path = arg.split('=', 1)
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    m = a.min(-1) < 238
    small = m[::3, ::3]; h, w = small.shape; lab = np.zeros((h, w), np.int32); sizes = [0]; cur = 0
    for sy in range(h):
        for sx in range(w):
            if small[sy, sx] and not lab[sy, sx]:
                cur += 1; q = deque([(sy, sx)]); lab[sy, sx] = cur; n = 0
                while q:
                    y, x = q.popleft(); n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < h and 0 <= xx < w and small[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; q.append((yy, xx))
                sizes.append(n)
    tot = sum(sizes); keep = [i for i, s in enumerate(sizes) if i and s > 0.04 * tot]
    ys, xs = np.nonzero(np.isin(lab, keep)); y0, y1, x0, x1 = ys.min() * 3, ys.max() * 3 + 3, xs.min() * 3, xs.max() * 3 + 3
    pad = 14; box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    c = im.crop(box); c.save(os.path.join(out, key + '.jpg'), quality=94); print(key, c.size)
