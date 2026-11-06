#!/usr/bin/env bash
# Despliegue automático: al terminar cada turno de Claude Code, si hay cambios,
# se confirman y se suben a GitHub (main). Railway despliega solo cada push a main.
# Los secretos (.env, CREDENCIALES-PRODUCCION.txt) están en .gitignore y nunca se suben.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || exit 0
[ -z "$(git status --porcelain)" ] && exit 0

git add -A
git -c user.name="montitechrd-cyber" -c user.email="montitechrd@gmail.com" \
  commit -q -m "Cambios desde Claude Code ($(date '+%Y-%m-%d %H:%M'))" || exit 0
if git push -q origin main 2>/dev/null; then
  echo "Cambios subidos a GitHub; Railway está desplegando https://cehacis.up.railway.app"
else
  echo "No se pudo subir a GitHub; los cambios quedaron confirmados en local." >&2
fi
exit 0
