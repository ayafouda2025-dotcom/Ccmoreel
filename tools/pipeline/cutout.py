# usage: python3 -I cutout.py SRC_DIR OUT_DIR id1 id2 ...   -> OUT_DIR/<id>.png (white bg removed, trimmed, max 720px)
import sys, os, glob, numpy as np
from PIL import Image
src, out, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(out, exist_ok=True)
for i in ids:
    f = glob.glob(os.path.join(src, i + '.*'))[0]
    im = Image.open(f).convert('RGBA'); im.thumbnail((720, 720), Image.LANCZOS)
    a = np.asarray(im).astype(np.int16); rgb = a[..., :3]
    white = (rgb.min(-1) > 198) & ((rgb.max(-1) - rgb.min(-1)) < 16)
    m = np.zeros_like(white); m[0, :] = white[0, :]; m[-1, :] = white[-1, :]; m[:, 0] = white[:, 0]; m[:, -1] = white[:, -1]
    for _ in range(4000):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        g &= white
        if (g == m).all(): break
        m = g
    alpha = np.where(m, 0, 255).astype(np.uint8)
    # soften edge 1px
    alpha = alpha.astype(np.float32); e = alpha.copy()
    e[1:-1, 1:-1] = (alpha[1:-1, 1:-1] * 4 + alpha[:-2, 1:-1] + alpha[2:, 1:-1] + alpha[1:-1, :-2] + alpha[1:-1, 2:]) / 8
    out_a = np.asarray(im).copy(); out_a[..., 3] = np.minimum(e, 255).astype(np.uint8)
    o = Image.fromarray(out_a); bb = o.getbbox(); o = o.crop(bb)
    o.save(os.path.join(out, i + '.png')); print(i, o.size, f"{(alpha==0).mean():.0%} removed")
