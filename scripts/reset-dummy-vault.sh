#!/bin/bash
# Reset dummy-demo-vault by copying from demo-vault
# Run this to get a fresh copy for testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SOURCE="$ROOT_DIR/demo-vault"
TARGET="$ROOT_DIR/dummy-demo-vault"

if [ ! -d "$SOURCE" ]; then
  echo "Error: demo-vault not found at $SOURCE"
  exit 1
fi

echo "Resetting dummy-demo-vault..."

# Remove existing dummy vault if it exists
rm -rf "$TARGET"

# Copy demo-vault to dummy-demo-vault
cp -r "$SOURCE" "$TARGET"

echo "Done. dummy-demo-vault is ready for testing."
