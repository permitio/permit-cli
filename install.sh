#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
print() {
    echo -e "${2}${1}${NC}"
}

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | tr '[:upper:]' '[:lower:]')

print "Detected OS: $OS, Architecture: $ARCH" "$YELLOW"

# Map architecture to pkg format
case $ARCH in
  x86_64)
    ARCH="x64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  *)
    print "Unsupported architecture: $ARCH" "$RED"
    exit 1
    ;;
esac

# Determine binary name
BINARY_NAME="permit"
if [ "$OS" = "windows" ]; then
  BINARY_NAME="${BINARY_NAME}.exe"
elif [ "$OS" = "darwin" ]; then
  BINARY_NAME="${BINARY_NAME}-macos"
else
  BINARY_NAME="${BINARY_NAME}-linux"
fi

# Get latest version
print "Fetching latest version..." "$YELLOW"
VERSION=$(curl -s https://api.github.com/repos/permitio/cli/releases/latest | grep -o '"tag_name": ".*"' | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
    print "Failed to fetch version" "$RED"
    exit 1
fi

DOWNLOAD_URL="https://github.com/permitio/cli/releases/download/${VERSION}/${BINARY_NAME}"

# Installation paths
INSTALL_DIR="/usr/local/bin"
if [ "$(id -u)" != "0" ]; then
  INSTALL_DIR="$HOME/.local/bin"
  print "Installing for current user only" "$YELLOW"
fi

# Create installation directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Download and install
print "Downloading permit CLI..." "$YELLOW"
if ! curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/permit"; then
    print "Failed to download binary" "$RED"
    exit 1
fi

chmod +x "$INSTALL_DIR/permit"

print "Installation complete! The permit CLI is now available at $INSTALL_DIR/permit" "$GREEN"
print "Try running: permit --version" "$GREEN" 