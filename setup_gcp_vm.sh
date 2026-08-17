#!/bin/bash
# ==============================================================================
# 🚀 InfluMaker - Turnkey Google Cloud VM 24/7 Setup Script
# ==============================================================================

set -e

echo "======================================================"
echo "🎬 InfluMaker: Setting up 24/7 Cloud VM for George"
echo "======================================================"

# 1. Update system packages
echo "📦 [1/6] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git ffmpeg build-essential

# 2. Install Node.js 20 LTS
echo "📦 [2/6] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 process manager
echo "📦 [3/6] Installing PM2..."
sudo npm install -g pm2

# 4. Install Project Dependencies & Playwright
echo "📦 [4/6] Installing Project Dependencies & Playwright Browsers..."
npm install
npx playwright install chromium --with-deps

# 5. Create logs directory
mkdir -p logs config

# 6. Start George under PM2 Cron
echo "🚀 [5/6] Starting George under PM2 Scheduler (4x daily)..."
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

echo "======================================================"
echo "🎉 24/7 SETUP COMPLETE!"
echo "======================================================"
echo "George is now running 24/7 in the cloud on slots 06:00, 11:00, 16:00, 20:00 UTC."
echo "Commands to monitor:"
echo "  - View live status:  pm2 status"
echo "  - View George logs:   pm2 logs george-producer-cron"
echo "  - Test run 1 cycle:  node src/agents/george.js --tick"
echo "======================================================"
