#!/usr/bin/env bash
# Turn a raw generated image into a game-ready sprite.
#
#   tools/prep-sprite.sh <input image> <slot name> <width>x<height> [background colour]
#
# - removes a flat background (default: the colour of the top-left pixel; pass e.g.
#   "#ff00ff" for a magenta backdrop), flood-filling in from all four corners
# - trims to the subject, fits it inside the target size and anchors it bottom-centre
# - writes assets/sprites/<slot>.png and adds it to assets/sprites/manifest.json
#
# Sizes for each slot are in SPRITES.md and on sprites.html. Needs ImageMagick.
set -euo pipefail
in="$1"; name="$2"; size="$3"; bg="${4:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/assets/sprites/$name.png"
w="${size%x*}"; h="${size#*x}"
[ -n "$bg" ] || bg="$(convert "$in" -format '%[pixel:p{0,0}]' info:)"
convert "$in" -alpha set -fuzz 12% -fill none \
  -draw "color 0,0 floodfill" -draw "color %[fx:w-1],0 floodfill" \
  -draw "color 0,%[fx:h-1] floodfill" -draw "color %[fx:w-1],%[fx:h-1] floodfill" \
  -trim +repage -resize "${w}x${h}" \
  -background none -gravity south -extent "${w}x${h}" "$out" 2>/dev/null || \
convert "$in" -alpha set -fuzz 12% -transparent "$bg" -trim +repage -resize "${w}x${h}" \
  -background none -gravity south -extent "${w}x${h}" "$out"
python3 - "$root/assets/sprites/manifest.json" "$name.png" <<'PY'
import json, sys
path, f = sys.argv[1], sys.argv[2]
m = json.load(open(path))
if f not in m["files"]:
    m["files"].append(f)
    m["files"].sort()
json.dump(m, open(path, "w"), indent=2)
PY
echo "wrote $out"
