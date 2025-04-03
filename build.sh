#!/bin/bash

# Create build directory
mkdir -p dist

# Build for macOS (arm64)
echo "Building for macOS (arm64)..."
deno compile \
  --target aarch64-apple-darwin \
  --allow-read --allow-write --allow-net --allow-env --allow-run --allow-sys \
  --output dist/permit-cli-macos-arm64 source/cli.tsx

# Build for macOS (x64)
echo "Building for macOS (x64)..."
deno compile \
  --target x86_64-apple-darwin \
  --allow-read --allow-write --allow-net --allow-env --allow-run --allow-sys \
  --output dist/permit-cli-macos-x64 source/cli.tsx

# Build for Linux (x64)
echo "Building for Linux (x64)..."
deno compile \
  --target x86_64-unknown-linux-gnu \
  --allow-read --allow-write --allow-net --allow-env --allow-run --allow-sys \
  --output dist/permit-cli-linux-x64 source/cli.tsx

# Build for Windows (x64)
echo "Building for Windows (x64)..."
deno compile \
  --target x86_64-pc-windows-msvc \
  --allow-read --allow-write --allow-net --allow-env --allow-run --allow-sys \
  --output dist/permit-cli-windows-x64.exe source/cli.tsx

# Create zip archives
echo "Creating zip archives..."
cd dist
zip permit-cli-macos-arm64.zip permit-cli-macos-arm64
zip permit-cli-macos-x64.zip permit-cli-macos-x64
zip permit-cli-linux-x64.zip permit-cli-linux-x64
zip permit-cli-windows-x64.zip permit-cli-windows-x64.exe
cd ..

# Build npm package
echo "Building npm package..."
npm run build

echo "Build complete! Check the dist directory for the compiled binaries and zip files." 