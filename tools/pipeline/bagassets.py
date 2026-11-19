# python3 -I bagassets.py SRC_DIR OUT_DIR -> bag_handle.png (cut out), wheel.png, open.png
import sys, os, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]

def flood_cut(a, bgfn):
    bg = bgfn(a)
    m = np.zeros_like(bg); m[0, :] = bg[0, :]; m[-1, :] = bg[-1, :]; m[:, 0] = bg[:, 0]; m[:, -1] = bg[:, -1]
    for _ in range(4000):
        g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; g &= bg
        if (g == m).all(): break
        m = g
    alpha = np.where(m, 0, 255).astype(np.float32)
    e = alpha.copy(); e[1:-1, 1:-1] = (alpha[1:-1, 1:-1] * 4 + alpha[:-2, 1:-1] + alpha[2:, 1:-1] + alpha[1:-1, :-2] + alpha[1:-1, 2:]) / 8
    return e.astype(np.uint8)

h = Image.open(os.path.join(src, 'dc55900d.webp')).convert('RGB')
a = np.asarray(h.crop((0, 15, 448, 700))).astype(int)
# light lavender studio background: bright and low-ish saturation (the bag itself is deep purple, wheels black)
light = lambda x: (x.min(-1) > 175) & ((x.max(-1) - x.min(-1)) < 70)
al = flood_cut(a, light)
im = Image.fromarray(np.dstack([a.astype(np.uint8), al]), 'RGBA'); im = im.crop(im.getbbox()); im.save(os.path.join(out, 'bag_handle.png')); print('bag_handle', im.size)
h.crop((458, 388, 712, 688)).save(os.path.join(out, 'wheel.png'))
Image.open(os.path.join(src, '61829472.webp')).convert('RGB').save(os.path.join(out, 'open.png'))
