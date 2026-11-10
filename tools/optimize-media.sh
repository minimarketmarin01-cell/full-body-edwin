#!/usr/bin/env bash
# Optimiza medios PROPIOS para la biblioteca de ejercicios.
#
# Uso:  tools/optimize-media.sh <entrada> <carpeta-salida>
#   <entrada>  imagen (png/jpg/webp) o animación/video (gif/mp4/webm/mov)
#   Genera en <carpeta-salida>:
#     preview.webp      imagen estática (máx. 400 px de ancho, calidad 80)
#     animation.gif     solo si la entrada es animación/video (360 px, 12 fps, paleta optimizada)
#     animation.webm    solo si la entrada es animación/video (VP9, sin audio)
#
# Requiere ffmpeg. Úsalo solo con medios que tengas derecho a usar.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Uso: $0 <entrada> <carpeta-salida>" >&2
  exit 1
fi
in="$1"; out="$2"
[ -f "$in" ] || { echo "No existe: $in" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "Falta ffmpeg" >&2; exit 1; }
mkdir -p "$out"

ext="${in##*.}"; ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
case "$ext" in
  gif|mp4|webm|mov|m4v) animated=1 ;;
  *) animated=0 ;;
esac

# Vista previa: primer fotograma, 400 px de ancho como máximo.
ffmpeg -v error -y -i "$in" -frames:v 1 -vf "scale='min(400,iw)':-2" -c:v libwebp -quality 80 "$out/preview.webp"

if [ "$animated" -eq 1 ]; then
  # GIF con paleta propia (menos peso y mejores colores).
  ffmpeg -v error -y -i "$in" -vf "fps=12,scale='min(360,iw)':-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 "$out/animation.gif"
  # WebM VP9: normalmente 3 a 10 veces más liviano que el GIF.
  ffmpeg -v error -y -i "$in" -an -vf "fps=24,scale='min(360,iw)':-2" -c:v libvpx-vp9 -b:v 0 -crf 36 "$out/animation.webm"
fi

echo "Listo en $out:"
ls -l "$out" | awk 'NR>1 {printf "  %-16s %6.1f KB\n", $9, $5/1024}'
