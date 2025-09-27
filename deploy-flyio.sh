#!/bin/bash

# Fly.io Deployment Script
# This script deploys the Next Meeting site to Fly.io

echo "🚀 Deploying to Fly.io..."

# Check if fly CLI is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Build the standalone version
echo "📦 Building standalone version..."
npm install
npx gulp --gulpfile gulpfile.standalone.js build

# Initialize Fly app if not already done
if [ ! -f "fly.toml" ]; then
    echo "📝 Initializing Fly app..."
    flyctl launch --name next-meeting-site --region iad --no-deploy
fi

# Deploy to Fly.io
echo "🌍 Deploying to Fly.io..."
flyctl deploy

# Get the app URL
APP_URL=$(flyctl info --json | jq -r '.Hostname')

echo "✅ Deployment complete!"
echo "🔗 Your app is available at: https://$APP_URL"
echo ""
echo "📊 View logs: flyctl logs"
echo "📊 View app status: flyctl status"