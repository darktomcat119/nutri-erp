#!/bin/bash
# ═══════════════════════════════════════════════════
# Nutri Cafeteria ERP — VPS Deployment Script
# Target: http://45.55.175.194:4040
# ═══════════════════════════════════════════════════

set -e

VPS_IP="45.55.175.194"
VPS_USER="root"
REMOTE_DIR="/opt/nutri-erp"

echo "═══════════════════════════════════════════"
echo " Nutri ERP — Deploying to $VPS_IP"
echo "═══════════════════════════════════════════"

# Step 1: Create tarball (exclude node_modules, .next, dist)
echo ""
echo "📦 Step 1: Packaging project..."
cd "$(dirname "$0")"
tar czf /tmp/nutri-erp.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='uploads/*' \
  -C . .

echo "   Archive: $(du -h /tmp/nutri-erp.tar.gz | cut -f1)"

# Step 2: Upload to VPS
echo ""
echo "🚀 Step 2: Uploading to VPS..."
scp /tmp/nutri-erp.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/nutri-erp.tar.gz

# Step 3: SSH and deploy
echo ""
echo "🔧 Step 3: Deploying on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_SCRIPT'
set -e

REMOTE_DIR="/opt/nutri-erp"

# Create project directory
mkdir -p $REMOTE_DIR
cd $REMOTE_DIR

# Extract
tar xzf /tmp/nutri-erp.tar.gz
rm /tmp/nutri-erp.tar.gz

# Stop existing containers if running
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
echo ""
echo "🐳 Building Docker containers..."
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for health
echo ""
echo "⏳ Waiting for services..."
sleep 10

# Check status
echo ""
echo "📊 Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "═══════════════════════════════════════════"
echo " ✅ Deployment complete!"
echo ""
echo " 🌐 Web:  http://45.55.175.194:4040"
echo " 🔌 API:  http://45.55.175.194:4041/api/v1"
echo " 📖 Docs: http://45.55.175.194:4041/api/docs"
echo "═══════════════════════════════════════════"
REMOTE_SCRIPT

# Cleanup local archive
rm /tmp/nutri-erp.tar.gz

echo ""
echo "✅ Done! Open http://${VPS_IP}:4040 in your browser"
