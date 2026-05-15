#!/bin/bash

# Pi Mission Control Build Script
# This script automates the compilation and packaging of the VS Code extension.

set -e

echo "🚀 Starting build process for Pi Mission Control..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Compile TypeScript
echo "🔨 Compiling TypeScript source..."
npm run compile

# 3. Package the extension
echo "📦 Packaging extension into .vsix..."
npm run package

# 4. Locate the resulting file
VSIX_FILE=$(ls pi-mission-control-*.vsix 2>/dev/null | head -n 1)

if [ -n "$VSIX_FILE" ]; then
    echo "--------------------------------------------------------------------------------"
    echo "✅ Build Successful!"
    echo "📦 Packaged extension: $VSIX_FILE"
    echo "🚀 To install: Open VS Code -> Extensions -> ... -> Install from VSIX..."
    echo "--------------------------------------------------------------------------------"
else
    echo "❌ Packaging failed. No .vsix file found."
    exit 1
fi
