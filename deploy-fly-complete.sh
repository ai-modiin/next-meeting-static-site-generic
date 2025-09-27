#!/bin/bash

# Complete Fly.io Deployment Script with Schedule Updater
# This deploys both the static site and the schedule updater service

set -e

echo "🚀 Complete Fly.io Deployment with Schedule Updater"
echo "=================================================="

# Check if fly CLI is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if jq is installed (required for parsing JSON)
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found. Installing jq is recommended for better output parsing."
    echo "   On macOS: brew install jq"
    echo "   On Linux: sudo apt-get install jq"
    # Continue without jq, using fallback values
fi

# Load environment
if [ -f .env.fly ]; then
    set -a
    source .env.fly
    set +a
else
    echo "⚠️  .env.fly not found. Using default configuration."
fi

# Step 1: Build the static site
echo ""
echo "📦 Step 1: Building static site..."
npm install
npx gulp --gulpfile gulpfile.standalone.js build

# Step 2: Deploy static site
echo ""
echo "🌍 Step 2: Deploying static site to Fly.io..."
if [ ! -f "fly.toml" ]; then
    flyctl launch --name next-meeting-site --region iad --no-deploy
fi
flyctl deploy --config fly.toml

# Step 3: Create persistent volume for data
echo ""
echo "💾 Step 3: Creating persistent volume for schedule data..."
flyctl volumes create meeting_data --size 1 --region iad --app next-meeting-site || echo "Volume already exists"

# Step 4: Deploy schedule updater service
echo ""
echo "⏰ Step 4: Deploying schedule updater service..."
if [ ! -f "fly.updater.toml" ]; then
    flyctl launch --name next-meeting-updater --region iad --no-deploy --config fly.updater.toml
fi

# Set secrets for Google Sheets (optional)
if [ ! -z "$GOOGLE_SHEET_ID" ]; then
    echo "🔐 Setting Google Sheets credentials..."
    flyctl secrets set GOOGLE_SHEET_ID="$GOOGLE_SHEET_ID" --app next-meeting-updater
    flyctl secrets set GOOGLE_API_KEY="$GOOGLE_API_KEY" --app next-meeting-updater
fi

# Deploy updater
flyctl deploy --config fly.updater.toml --app next-meeting-updater

# Get URLs
SITE_URL=$(flyctl info --json --app next-meeting-site | jq -r '.Hostname' || echo "next-meeting-site.fly.dev")
UPDATER_URL=$(flyctl info --json --app next-meeting-updater | jq -r '.Hostname' || echo "next-meeting-updater.fly.dev")

echo ""
echo "✅ Deployment complete!"
echo "========================"
echo "📍 Static Site: https://$SITE_URL"
echo "⏰ Updater Service: https://$UPDATER_URL"
echo ""
echo "📊 View site logs: flyctl logs --app next-meeting-site"
echo "📊 View updater logs: flyctl logs --app next-meeting-updater"
echo "🔄 Trigger manual update: flyctl ssh console --app next-meeting-updater -C 'node update-schedule.js'"
echo ""
echo "💡 The schedule will update automatically every hour."
echo "   First update will run immediately on deployment."