#!/bin/bash
#
# DevFactory Unified Installer
# ============================
# 
# Installs both DevFactoryCLI (planning) and devfactory-distributed (execution)
# as one seamless system.
#
# Usage: curl -sSL https://raw.githubusercontent.com/JohnNorquay/devfactory-distributed/main/install-unified.sh | bash
#

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                           ║"
echo "║   🦁 DEVFACTORY UNIFIED INSTALLER                                         ║"
echo "║                                                                           ║"
echo "║   Installing the complete system:                                         ║"
echo "║   • DevFactoryCLI (Claude Code plugin for planning)                       ║"
echo "║   • devfactory-distributed (local orchestrator for execution)             ║"
echo "║                                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Detect Claude plugins directory
if [ -d "$HOME/.claude/plugins" ]; then
    PLUGINS_DIR="$HOME/.claude/plugins"
elif [ -d "/mnt/c/Users/$USER/.claude/plugins" ]; then
    PLUGINS_DIR="/mnt/c/Users/$USER/.claude/plugins"
else
    PLUGINS_DIR="$HOME/.claude/plugins"
    mkdir -p "$PLUGINS_DIR"
fi

echo "📁 Plugins directory: $PLUGINS_DIR"
echo ""

# Check dependencies
echo "🔍 Checking dependencies..."

check_dep() {
    if command -v "$1" &> /dev/null; then
        echo "   ✓ $1"
        return 0
    else
        echo "   ✗ $1 (required)"
        return 1
    fi
}

DEPS_OK=true
check_dep "git" || DEPS_OK=false
check_dep "node" || DEPS_OK=false
check_dep "npm" || DEPS_OK=false
check_dep "tmux" || DEPS_OK=false
check_dep "claude" || echo "   ⚠ claude CLI (install from npm: npm i -g @anthropic-ai/claude-code)"

if [ "$DEPS_OK" = false ]; then
    echo ""
    echo "❌ Missing required dependencies. Please install them first."
    exit 1
fi

echo ""

# Install DevFactoryCLI
echo "📦 Installing DevFactoryCLI..."
if [ -d "$PLUGINS_DIR/DevFactoryCLI" ]; then
    echo "   Updating existing installation..."
    cd "$PLUGINS_DIR/DevFactoryCLI"
    git pull
else
    echo "   Cloning repository..."
    git clone https://github.com/JohnNorquay/DevFactoryCLI.git "$PLUGINS_DIR/DevFactoryCLI"
    cd "$PLUGINS_DIR/DevFactoryCLI"
fi
echo "   ✓ DevFactoryCLI installed"
echo ""

# Install devfactory-distributed
echo "📦 Installing devfactory-distributed..."
if [ -d "$PLUGINS_DIR/devfactory-distributed" ]; then
    echo "   Updating existing installation..."
    cd "$PLUGINS_DIR/devfactory-distributed"
    git pull
else
    echo "   Cloning repository..."
    git clone https://github.com/JohnNorquay/devfactory-distributed.git "$PLUGINS_DIR/devfactory-distributed"
    cd "$PLUGINS_DIR/devfactory-distributed"
fi

echo "   Installing npm dependencies..."
npm install --silent

echo "   Building TypeScript..."
npm run build --silent 2>/dev/null || {
    echo "   Building with tsc..."
    npx tsc
}

echo "   Linking CLI globally..."
npm link --silent 2>/dev/null || sudo npm link --silent

echo "   ✓ devfactory-distributed installed"
echo ""

# Verify installation
echo "🔍 Verifying installation..."

if command -v devfactory &> /dev/null; then
    VERSION=$(devfactory --version 2>/dev/null || echo "installed")
    echo "   ✓ devfactory CLI available (v$VERSION)"
else
    echo "   ⚠ devfactory CLI not in PATH"
    echo "     Try: export PATH=\"\$PATH:$PLUGINS_DIR/devfactory-distributed/dist\""
fi

if [ -f "$PLUGINS_DIR/DevFactoryCLI/commands/release-the-beast.md" ]; then
    echo "   ✓ DevFactoryCLI commands available"
else
    echo "   ⚠ DevFactoryCLI commands not found"
fi

echo ""

# Setup instructions
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                           ║"
echo "║   ✅ INSTALLATION COMPLETE!                                               ║"
echo "║                                                                           ║"
echo "╠═══════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                           ║"
echo "║   SETUP:                                                                  ║"
echo "║                                                                           ║"
echo "║   1. Set your Anthropic API key:                                          ║"
echo "║      export ANTHROPIC_API_KEY=your-key-here                               ║"
echo "║                                                                           ║"
echo "║   2. Add to your ~/.bashrc or ~/.zshrc:                                   ║"
echo "║      export ANTHROPIC_API_KEY=your-key-here                               ║"
echo "║                                                                           ║"
echo "╠═══════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                           ║"
echo "║   USAGE:                                                                  ║"
echo "║                                                                           ║"
echo "║   Start a new project:                                                    ║"
echo "║      mkdir my-project && cd my-project                                    ║"
echo "║      claude                                                               ║"
echo "║                                                                           ║"
echo "║   In Claude Code, use these commands:                                     ║"
echo "║      /plan-product        → Design your product                           ║"
echo "║      /shape-spec          → Shape each feature                            ║"
echo "║      /create-spec         → Create detailed specs                         ║"
echo "║      /release-the-beast   → 🦁 Build it autonomously!                     ║"
echo "║                                                                           ║"
echo "║   Or use the CLI directly:                                                ║"
echo "║      devfactory release-the-beast                                         ║"
echo "║      devfactory status                                                    ║"
echo "║      devfactory kill-beast                                                ║"
echo "║                                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""
