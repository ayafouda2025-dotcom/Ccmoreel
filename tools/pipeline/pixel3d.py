# python3 -I pixel3d.py IN_DIR OUT_DIR cells id1 id2 ...  -> OUT_DIR/<id>.png  (pixel-art product with 3D extrusion, 1 px = 1 cell)
import sys, os, numpy as np
from PIL import Image
src, out, cells, ids = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4:]
os.makedirs(out, exist_ok=True)
INK = np.array([43, 28, 51])
for i in ids:
    c = cells * (1.25 if i == '81c5cd68' else 1)
    im = Image.open(os.path.join(src, i + '.png')).convert('RGBA')
    w = int(c); h = max(1, round(im.height * w / im.width))
    small = im.resize((w, h), Image.BOX)
    a = np.asarray(small).astype(np.float32)
    mask = a[..., 3] > 140
    # quantize colours for a crisp pixel look
    rgb = Image.fromarray(a[..., :3].astype(np.uint8)).quantize(colors=28, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    rgb = np.asarray(rgb).astype(np.float32)
    D = max(4, round(w / 22))                       # extrusion depth in cells
    W2, H2 = w + D + 2, h + D + 2
    canvas = np.zeros((H2, W2, 4), np.uint8)
    # side walls: shifted copies, darker the deeper they go
    for k in range(D, 0, -1):
        shade = 0.38 + 0.18 * (1 - k / D)
        ys, xs = np.nonzero(mask)
        col = (rgb[ys, xs] * shade + INK * (1 - shade) * 0.6).clip(0, 255)
        canvas[ys + 1 + k, xs + 1 + k, :3] = col.astype(np.uint8); canvas[ys + 1 + k, xs + 1 + k, 3] = 255
    # front face
    ys, xs = np.nonzero(mask)
    canvas[ys + 1, xs + 1, :3] = rgb[ys, xs].astype(np.uint8); canvas[ys + 1, xs + 1, 3] = 255
    # top-left rim highlight (1 cell) for a lit edge
    edge = mask & ~np.roll(mask, 1, 0)
    ys, xs = np.nonzero(edge)
    canvas[ys + 1, xs + 1, :3] = np.minimum(255, rgb[ys, xs] * 1.25 + 20).astype(np.uint8)
    # outline around everything
    filled = canvas[..., 3] > 0
    ring = np.zeros_like(filled)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ring |= np.roll(np.roll(filled, dy, 0), dx, 1)
    ring &= ~filled
    canvas[ring, :3] = INK; canvas[ring, 3] = 255
    Image.fromarray(canvas, 'RGBA').save(os.path.join(out, i + '.png')); print(i, W2, H2)
