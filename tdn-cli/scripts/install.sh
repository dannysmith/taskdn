#!/bin/bash
set -euo pipefail

# tdn-cli installer
# Usage: curl -fsSL https://github.com/taskdn/taskdn/releases/latest/download/install.sh | bash
#
# Environment variables:
#   TDN_VERSION     - Version to install (default: latest)
#   TDN_INSTALL_DIR - Installation directory (default: ~/.local/bin)
#   TDN_SKIP_VERIFY - Set to 1 to skip checksum verification

VERSION="${TDN_VERSION:-latest}"
INSTALL_DIR="${TDN_INSTALL_DIR:-$HOME/.local/bin}"
SKIP_VERIFY="${TDN_SKIP_VERIFY:-0}"

REPO="taskdn/taskdn"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

info() { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}Warning:${NC} $1"; }
error() { echo -e "${RED}Error:${NC} $1" >&2; exit 1; }

# Check for required commands
command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
command -v tar >/dev/null 2>&1 || error "tar is required but not installed"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="darwin" ;;
  Linux) PLATFORM="linux" ;;
  *) error "Unsupported operating system: $OS (only macOS and Linux are supported)" ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) error "Unsupported architecture: $ARCH" ;;
esac

TARGET="${PLATFORM}-${ARCH}"
info "Detected platform: ${TARGET}"

# Get version
if [ "$VERSION" = "latest" ]; then
  info "Fetching latest version..."
  # Filter for tdn-cli releases specifically
  VERSION=$(curl -sL "https://api.github.com/repos/${REPO}/releases" | \
    grep '"tag_name":' | \
    grep 'tdn-cli-v' | \
    head -1 | \
    sed -E 's/.*"tdn-cli-v([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    error "Failed to fetch latest version. Check your internet connection."
  fi
fi
info "Version: ${VERSION}"

# Construct download URLs
ARCHIVE="tdn-${TARGET}.tar.gz"
BASE_URL="https://github.com/${REPO}/releases/download/tdn-cli-v${VERSION}"
ARCHIVE_URL="${BASE_URL}/${ARCHIVE}"
CHECKSUM_URL="${BASE_URL}/${ARCHIVE}.sha256"

# Create temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Download archive
info "Downloading ${ARCHIVE}..."
if ! curl -fsSL "$ARCHIVE_URL" -o "$TMPDIR/$ARCHIVE"; then
  error "Failed to download ${ARCHIVE_URL}"
fi

# Verify checksum
if [ "$SKIP_VERIFY" != "1" ]; then
  info "Verifying checksum..."
  if curl -fsSL "$CHECKSUM_URL" -o "$TMPDIR/checksum.sha256" 2>/dev/null; then
    EXPECTED=$(cut -d' ' -f1 "$TMPDIR/checksum.sha256")
    ACTUAL=""
    if command -v sha256sum >/dev/null 2>&1; then
      ACTUAL=$(sha256sum "$TMPDIR/$ARCHIVE" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then
      ACTUAL=$(shasum -a 256 "$TMPDIR/$ARCHIVE" | cut -d' ' -f1)
    fi
    if [ -z "$ACTUAL" ]; then
      warn "No hash tool available (sha256sum or shasum), skipping verification"
    elif [ "$EXPECTED" != "$ACTUAL" ]; then
      error "Checksum mismatch!\n  Expected: ${EXPECTED}\n  Actual:   ${ACTUAL}"
    else
      info "Checksum verified"
    fi
  else
    warn "Could not download checksum file, skipping verification"
  fi
fi

# Extract
info "Extracting..."
tar -xzf "$TMPDIR/$ARCHIVE" -C "$TMPDIR"

# Install
mkdir -p "$INSTALL_DIR"
mv "$TMPDIR/tdn" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/tdn"

# Verify installation
if [ -x "$INSTALL_DIR/tdn" ]; then
  INSTALLED_VERSION=$("$INSTALL_DIR/tdn" --version 2>/dev/null || echo "unknown")
  info "Successfully installed tdn v${INSTALLED_VERSION} to ${INSTALL_DIR}/tdn"
else
  error "Installation failed - binary not executable"
fi

# Check if in PATH
if ! command -v tdn >/dev/null 2>&1; then
  echo ""
  warn "${INSTALL_DIR} is not in your PATH"
  echo ""
  echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  echo "  export PATH=\"\$PATH:${INSTALL_DIR}\""
  echo ""
  echo "Then restart your shell or run: source ~/.bashrc"
fi

echo ""
info "Run 'tdn --help' to get started"
