"""
Modify Share Tech Mono: replace the slashed zero glyph with an unslashed version
by copying the O glyph's contours to the zero glyph, preserving zero's metrics.
"""
import copy
from fontTools.ttLib import TTFont

FONT_DIR = "C:/Users/Lia/Documents/Gravity/nwl-scoreboard/public/fonts"
INPUT = f"{FONT_DIR}/ShareTechMono-Regular.woff2"
OUTPUT = f"{FONT_DIR}/ShareTechMono-Regular-noslash.woff2"

font = TTFont(INPUT)
glyf = font["glyf"]
hmtx = font["hmtx"]
cmap = font.getBestCmap()

zero_name = cmap[0x30]  # 'zero'
O_name = cmap[0x4F]     # 'O'

zero_glyph = glyf[zero_name]
O_glyph = glyf[O_name]

# Save zero's original metrics
zero_width, zero_lsb = hmtx[zero_name]

# Deep copy O glyph data onto zero
new_zero = copy.deepcopy(O_glyph)

# The O glyph has a slightly different bounding box (x: 70-470 vs 92-448 for zero).
# We need to shift and scale the O contours to match zero's proportions.
# Actually, since both are monospaced at 540 width, and the shapes are very similar,
# let's just adjust the coordinates to center within the zero's original bounds.

# Zero outer: x:[92,448] y:[0,700]
# O outer:    x:[70,470] y:[0,700]
# The y range is identical. X needs shifting: O is wider by (470-70)=400 vs (448-92)=356
# We'll scale the x coordinates to fit the zero's x range.

O_x_min, O_x_max = 70, 470
Z_x_min, Z_x_max = 92, 448

O_x_range = O_x_max - O_x_min  # 400
Z_x_range = Z_x_max - Z_x_min  # 356

scale_x = Z_x_range / O_x_range  # 0.89

coords = list(new_zero.coordinates)
for i in range(len(coords)):
    x, y = coords[i]
    # Scale and shift x to match zero's bounds
    new_x = Z_x_min + (x - O_x_min) * scale_x
    coords[i] = (round(new_x), y)

from fontTools.ttLib.tables._g_l_y_f import Glyph
new_zero.coordinates = type(O_glyph.coordinates)(coords)

# Update the glyph
glyf[zero_name] = new_zero

# Restore zero's metrics
hmtx[zero_name] = (zero_width, zero_lsb)

# Recalculate bounds
glyf[zero_name].recalcBounds(glyf)

# Save as woff2
font.flavor = "woff2"
font.save(OUTPUT)
print(f"Saved modified font to {OUTPUT}")

# Verify
font2 = TTFont(OUTPUT)
g = font2["glyf"][zero_name]
print(f"New zero: {g.numberOfContours} contours")
ends = g.endPtsOfContours
start = 0
for i, end in enumerate(ends):
    contour_coords = g.coordinates[start:end+1]
    xs = [c[0] for c in contour_coords]
    ys = [c[1] for c in contour_coords]
    print(f"  Contour {i}: {end-start+1} points, x:[{min(xs)},{max(xs)}] y:[{min(ys)},{max(ys)}]")
    start = end + 1
print(f"Metrics: {font2['hmtx'][zero_name]}")
