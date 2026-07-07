#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIST_DIR="$ROOT_DIR/dist"
VERSION=$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_DIR/manifest.json" | head -n 1)

if [ -z "$VERSION" ]; then
  echo "Failed to read version from manifest.json" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"

for path in \
  manifest.json \
  background.js \
  devtools.html \
  devtools.js \
  panel.html \
  panel.js \
  icons/icon-16.png \
  icons/icon-32.png \
  icons/icon-48.png \
  icons/icon-96.png \
  icons/panel.svg
do
  if [ ! -e "$ROOT_DIR/$path" ]; then
    echo "Missing required path: $path" >&2
    exit 1
  fi

done

OUTPUT="$DIST_DIR/req-export-${VERSION}.zip"
rm -f "$OUTPUT"

(
  cd "$ROOT_DIR"
  zip -q "$OUTPUT" \
    manifest.json \
    background.js \
    devtools.html \
    devtools.js \
    panel.html \
    panel.js \
    icons/icon-16.png \
    icons/icon-32.png \
    icons/icon-48.png \
    icons/icon-96.png \
    icons/panel.svg
)

echo "$OUTPUT"
