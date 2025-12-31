#!/bin/bash
set -euo pipefail

# Build release binary for current platform (macOS/Linux only)
# Usage: ./scripts/build-release.sh

VERSION="${VERSION:-dev}"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Normalize architecture names
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

OUTPUT_NAME="tdn-${PLATFORM}-${ARCH}"

echo "Building tdn v${VERSION} for ${PLATFORM}-${ARCH}..."

# Ensure bindings are built
bun run build

# Build standalone binary
bun build --compile --minify src/index.ts --outfile "dist/${OUTPUT_NAME}"

echo "Built: dist/${OUTPUT_NAME}"
ls -lh "dist/${OUTPUT_NAME}"
