# python3 -I sheet.py IMG_DIR OUT.png  -> labelled thumbnail sheet of every readable image
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
ok = []
for f in sorted(os.listdir(d)):
    try:
        im = Image.open(os.path.join(d, f)); im.load(); ok.append(f)
    except Exception:
        pass
W, cols = 220, 6
rows = max(1, (len(ok) + cols - 1) // cols)
sh = Image.new('RGB', (cols * W, rows * (W + 14)), '#888'); dr = ImageDraw.Draw(sh)
for k, f in enumerate(ok):
    im = Image.open(os.path.join(d, f)).convert('RGB'); im.thumbnail((W - 6, W - 6))
    x, y = (k % cols) * W, (k // cols) * (W + 14); sh.paste(im, (x + 3, y + 3)); dr.text((x + 4, y + W), f, fill='white')
sh.save(out); print(len(ok), 'images')
