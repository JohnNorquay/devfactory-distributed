#!/bin/bash

# DevFactory Distributed v3.1 Installer

echo "🚀 Installing DevFactory Distributed v3.1"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v)"

# Check tmux
if ! command -v tmux &> /dev/null; then
    echo "⚠️  tmux not found. Installing..."
    if command -v apt &> /dev/null; then
        sudo apt install -y tmux
    elif command -v brew &> /dev/null; then
        brew install tmux
    else
        echo "❌ Please install tmux manually"
        exit 1
    fi
fi
echo "✓ tmux installed"

# Check Claude Code
if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude Code CLI not found"
    echo "   Install it first, then re-run this script"
    echo "   See: https://docs.anthropic.com/claude-code"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build
echo ""
echo "🔨 Building..."
npm run build

# Link globally
echo ""
echo "🔗 Linking globally..."
npm link

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. cd ~/your-project"
echo "  2. devfactory init"
echo "  3. devfactory setup-github"
echo "  4. devfactory start"
echo ""
