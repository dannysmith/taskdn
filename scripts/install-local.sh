#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_DIR="$PROJECT_ROOT/tdn-cli"
INSTALL_DIR="$HOME/.local/bin"

echo -e "${BLUE}=== Installing tdn CLI locally ===${NC}\n"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed${NC}"
    echo "Please install Bun from https://bun.sh"
    exit 1
fi

echo -e "${GREEN}✓${NC} Bun found: $(bun --version)"

# Create ~/.local/bin if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Creating $INSTALL_DIR${NC}"
    mkdir -p "$INSTALL_DIR"
fi

# Navigate to CLI directory
cd "$CLI_DIR"
echo -e "${BLUE}Working directory:${NC} $CLI_DIR\n"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
bun install

# Build Rust bindings
echo -e "\n${BLUE}Building Rust bindings (this may take a minute)...${NC}"
bun run build

# Make the entry point executable
echo -e "\n${BLUE}Making entry point executable...${NC}"
chmod +x src/index.ts

# Create symlink
SYMLINK_PATH="$INSTALL_DIR/tdn"
ENTRY_POINT="$CLI_DIR/src/index.ts"

if [ -L "$SYMLINK_PATH" ]; then
    echo -e "${YELLOW}Removing existing symlink at $SYMLINK_PATH${NC}"
    rm -f "$SYMLINK_PATH"
fi

echo -e "${BLUE}Creating symlink:${NC}"
echo -e "  $SYMLINK_PATH -> $ENTRY_POINT"
ln -sf "$ENTRY_POINT" "$SYMLINK_PATH"

# Verify installation
echo -e "\n${BLUE}Verifying installation...${NC}"

if [ ! -L "$SYMLINK_PATH" ]; then
    echo -e "${RED}✗ Failed to create symlink${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Symlink created successfully"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo -e "\n${YELLOW}Warning: $INSTALL_DIR is not in your PATH${NC}"
    echo -e "Add this to your ~/.zshrc or ~/.bashrc:"
    echo -e "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo -e "\nThen run: ${BLUE}source ~/.zshrc${NC} (or ~/.bashrc)"
else
    echo -e "${GREEN}✓${NC} $INSTALL_DIR is in PATH"
fi

# Test the command
echo -e "\n${BLUE}Testing installation...${NC}"
if "$SYMLINK_PATH" --version &> /dev/null; then
    VERSION=$("$SYMLINK_PATH" --version)
    echo -e "${GREEN}✓${NC} tdn installed successfully!"
    echo -e "${GREEN}✓${NC} Version: $VERSION"
else
    echo -e "${RED}✗ Installation test failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Installation complete! ===${NC}"
echo -e "\nYou can now run: ${BLUE}tdn --help${NC}"
echo -e "\nTo update tdn in the future, run:"
echo -e "  ${BLUE}cd $PROJECT_ROOT && git pull && bun run build${NC}"
