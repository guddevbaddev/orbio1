#!/usr/bin/env bash
# Turn a raw generated image into a game-ready sprite.
#
#   tools/prep-sprite.sh <input image> <slot name> <width>x<height> [mode] [background colour]
#
# Modes:
#   fit    (default) remove a flat background, trim to the subject, fit it inside the
#          size and stand it on the bottom centre. For buildings, props, icons, portraits.
#   exact  remove a flat background, then resize to exactly the size without trimming.
#          For menu frames (9-slice), the title logo and pre-laid-out sprite sheets.
#   tile   no background removal; resize to exactly the size. For ground tiles.
#   frame  same as tile. For 9-slice menu frames and the meter bar, which fill the image.
#
# The background colour defaults to magenta (#ff00ff), as the prompts ask for.
# Writes assets/sprites/<slot>.png and adds it to assets/sprites/manifest.json.
# Sizes for every slot are in PROMPTS.md, SPRITE_TRACKER.md and sprites.html. Needs ImageMagick.
set -euo pipefail
in="$1"; name="$2"; size="$3"; mode="${4:-fit}"; bg="${5:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/assets/sprites/$name.png"
w="${size%x*}"; h="${size#*x}"
[ -n "$bg" ] || bg="#ff00ff"

# Clear the flat background: flood-fill from each corner, but only where the corner is the
# background colour (so a frame or texture that reaches the edge is left alone).
key() {
  local W H; read -r W H < <(identify -format '%w %h\n' "$1" | head -1)
  convert "$1" -alpha set -fuzz 12% -fill none \
    -floodfill +0+0 "$bg" -floodfill +$((W - 1))+0 "$bg" -floodfill +0+$((H - 1)) "$bg" -floodfill +$((W - 1))+$((H - 1)) "$bg" "$2"
}

tmp="$(mktemp --suffix=.png)"; trap 'rm -f "$tmp"' EXIT
case "$mode" in
  fit)   key "$in" "$tmp"; convert "$tmp" -trim +repage -resize "${w}x${h}" -background none -gravity south -extent "${w}x${h}" "$out" ;;
  exact) key "$in" "$tmp"; convert "$tmp" -resize "${w}x${h}!" "$out" ;;
  tile|frame) convert "$in" -resize "${w}x${h}!" "$out" ;;
  *) echo "unknown mode: $mode (fit, exact, frame or tile)" >&2; exit 1 ;;
esac

python3 - "$root/assets/sprites/manifest.json" "$name.png" <<'PY'
import json, sys
path, f = sys.argv[1], sys.argv[2]
m = json.load(open(path))
if f not in m["files"]:
    m["files"].append(f)
    m["files"].sort()
json.dump(m, open(path, "w"), indent=2)
PY
echo "wrote $out ($mode)"
