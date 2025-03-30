#!/bin/bash

set -e

# Parse arguments
DRY_RUN=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | tr '[:upper:]' '[:lower:]')

# Map architecture to GitHub release format
case $ARCH in
  x86_64)
    ARCH="x64"
    ;;
  aarch64)
    ARCH="arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Get latest version
LATEST_VERSION=$(curl -s https://api.github.com/repos/permitio/cli/releases/latest | grep -o '"tag_name": ".*"' | cut -d'"' -f4)

# Download URL
DOWNLOAD_URL="https://github.com/permitio/cli/releases/download/${LATEST_VERSION}/permit-cli-${OS}-${ARCH}"

# Installation directory
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
  INSTALL_DIR="$HOME/.local/bin"
fi

if [ "$DRY_RUN" = true ]; then
    echo "Dry run mode:"
    echo "OS: $OS"
    echo "Architecture: $ARCH"
    echo "Install directory: $INSTALL_DIR"
    echo "Download URL: $DOWNLOAD_URL"
    echo "Latest version: $LATEST_VERSION"
    exit 0
fi

# Create installation directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Download and install
echo "Downloading permit-cli ${LATEST_VERSION}..."
curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/permit-cli"
chmod +x "$INSTALL_DIR/permit-cli"

echo "Installation complete! permit-cli has been installed to $INSTALL_DIR"
echo "You may need to add $INSTALL_DIR to your PATH if it's not already there." 