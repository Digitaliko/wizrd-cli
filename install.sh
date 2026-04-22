#!/bin/bash
# wizrd-cli installer
# Usage: git clone git@github.com:Digitaliko/wizrd-cli.git ~/.wizrd-cli && ~/.wizrd-cli/install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="${WIZRD_BIN_DIR:-$HOME/.local/bin}"
STATE_DIR="$SCRIPT_DIR/state"

echo "=== wizrd-cli installer ==="

# Check bun
if ! command -v bun &>/dev/null; then
    if [ -f "$HOME/.bun/bin/bun" ]; then
        export PATH="$HOME/.bun/bin:$PATH"
    else
        echo "Error: bun not found. Install: curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi
fi

# Install deps
echo "Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

# Create state directory
mkdir -p "$STATE_DIR"

# Symlink CLI binaries
echo "Linking CLI binaries..."
for bin_file in "$SCRIPT_DIR"/bin/*; do
    [ ! -f "$bin_file" ] && continue
    chmod +x "$bin_file"
    name=$(basename "$bin_file")
    target="$BIN_DIR/$name"
    if [ -L "$target" ] || [ ! -e "$target" ]; then
        ln -sf "$bin_file" "$target"
        echo "  $name → $target"
    else
        echo "  Warning: $target exists and is not a symlink, skipping"
    fi
done

echo ""
echo "=== wizrd-cli installed ==="
echo "Available commands:"
for bin_file in "$SCRIPT_DIR"/bin/*; do
    [ ! -f "$bin_file" ] && continue
    echo "  $(basename "$bin_file")"
done
