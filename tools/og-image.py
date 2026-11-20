# Generates /og.png (1200x630) for social previews. Plain shapes and text only.
# Run: python3 tools/og-image.py   (needs Pillow and DejaVu fonts)
from PIL import Image, ImageDraw, ImageFont
import os
W, H = 1200, 630
img = Image.new('RGB', (W, H), '#111418')
d = ImageDraw.Draw(img)
F = '/usr/share/fonts/truetype/dejavu/'
big = ImageFont.truetype(F + 'DejaVuSans-Bold.ttf', 76)
mid = ImageFont.truetype(F + 'DejaVuSans.ttf', 38)
small = ImageFont.truetype(F + 'DejaVuSans-Bold.ttf', 34)
d.rectangle([0, 0, W, 14], fill='#f59e0b')
# two simple tire outlines, to scale-ish: 31.6 in vs 33 in
cx, base = 930, 520
for r, col, wdt in ((175, '#60a5fa', 14), (183, '#fb923c', 8)):
    d.ellipse([cx - r, base - 2 * r, cx + r, base], outline=col, width=wdt)
    d.ellipse([cx - r * 0.55, base - r - r * 0.55, cx + r * 0.55, base - r + r * 0.55], outline=col, width=4)
d.line([700, base, 1160, base], fill='#a2abb6', width=3)
d.text((70, 120), 'Tire Size', font=big, fill='#e8ebef')
d.text((70, 205), 'Calculator', font=big, fill='#e8ebef')
d.text((70, 320), 'Compare two sizes:', font=mid, fill='#a2abb6')
d.text((70, 370), 'diameter, revs/mile,', font=mid, fill='#a2abb6')
d.text((70, 420), 'speedometer error', font=mid, fill='#a2abb6')
d.text((70, 530), 'tiresizing.pages.dev  ·  free, no ads', font=small, fill='#f59e0b')
img.save(os.path.join(os.path.dirname(__file__), '..', 'og.png'), optimize=True)
