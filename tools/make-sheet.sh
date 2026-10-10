#!/usr/bin/env bash
# Build a character or crop sprite sheet from separate frame images, so each frame can be
# generated on its own (image generators are bad at even grids).
#
#   tools/make-sheet.sh <slot name> <cols> <rows> <cellW>x<cellH> frame1.png frame2.png …
#
# Give the frames row by row (row 1 left to right, then row 2…). Each frame has its flat
# background removed, is trimmed, fitted into its cell and stood on the bottom centre.
# Missing frames at the end are filled with the last frame. Cell sizes are in PROMPTS.md.
# Writes assets/sprites/<slot>.png and adds it to the manifest. Needs ImageMagick.
set -euo pipefail
name="$1"; cols="$2"; rows="$3"; cell="$4"; shift 4
root="$(cd "$(dirname "$0")/.." && pwd)"
cw="${cell%x*}"; ch="${cell#*x}"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
frames=("$@"); n=$((cols * rows)); last="${frames[${#frames[@]}-1]}"
bg="${BG:-#ff00ff}"  # background colour to remove; override with BG=… if yours differs
for ((i = 0; i < n; i++)); do
  f="${frames[$i]:-$last}"
  read -r W H < <(identify -format '%w %h\n' "$f" | head -1)
  convert "$f" -alpha set -fuzz 12% -fill none \
    -floodfill +0+0 "$bg" -floodfill +$((W - 1))+0 "$bg" -floodfill +0+$((H - 1)) "$bg" -floodfill +$((W - 1))+$((H - 1)) "$bg" \
    -trim +repage -resize "$((cw - 2))x$((ch - 2))" -background none -gravity south -extent "${cw}x${ch}" \
    "$work/$(printf %03d "$i").png"
done
for ((r = 0; r < rows; r++)); do
  row=(); for ((c = 0; c < cols; c++)); do row+=("$work/$(printf %03d $((r * cols + c))).png"); done
  convert "${row[@]}" -background none +append "$work/row$r.png"
done
convert $(for ((r = 0; r < rows; r++)); do echo "$work/row$r.png"; done) -background none -append +repage "$root/assets/sprites/$name.png"
python3 - "$root/assets/sprites/manifest.json" "$name.png" <<'PY'
import json, sys
path, f = sys.argv[1], sys.argv[2]
m = json.load(open(path))
if f not in m["files"]:
    m["files"].append(f)
    m["files"].sort()
json.dump(m, open(path, "w"), indent=2)
PY
echo "wrote assets/sprites/$name.png ($cols×$rows cells of $cell)"
