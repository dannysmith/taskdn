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

# Create symlink for local Obsidian plugin development
PLUGIN_DIR="$TARGET/.obsidian/plugins"
PLUGIN_LINK="$PLUGIN_DIR/obsidian-taskdn"
PLUGIN_SOURCE="/Users/danny/dev/obsidian-taskdn"

mkdir -p "$PLUGIN_DIR"

if ln_error=$(ln -sf "$PLUGIN_SOURCE" "$PLUGIN_LINK" 2>&1); then
  echo "Created symlink for obsidian-taskdn plugin"
else
  echo "Warning: Could not create symlink for obsidian-taskdn plugin"
  echo "  $ln_error"
  echo "  Source: $PLUGIN_SOURCE"
  echo "  Target: $PLUGIN_LINK"
fi

echo ""
echo "Done. dummy-demo-vault is ready for testing."
OBSIDIAN_URL="obsidian://open?path=$TARGET"
printf 'Open in Obsidian: \e]8;;%s\e\\%s\e]8;;\e\\\n' "$OBSIDIAN_URL" "$OBSIDIAN_URL"
