#!/bin/bash

# Production Deployment Script for Marketing NBP
# This script builds and starts the application in production mode

set -e # Exit on error

echo "🚀 Marketing NBP - Production Deployment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production.local exists
if [ ! -f .env.production.local ]; then
    echo -e "${YELLOW}⚠️  .env.production.local not found!${NC}"
    echo "Creating from .env.production template..."
    cp .env.production .env.production.local
    echo -e "${RED}❌ Please edit .env.production.local with actual production values${NC}"
    echo "Then run this script again."
    exit 1
fi

# Load environment variables
export $(cat .env.production.local | xargs)

echo ""
echo "Step 1: Checking Prerequisites"
echo "--------------------------------"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check PostgreSQL connection
echo ""
echo "Step 2: Checking Database Connection"
echo "-------------------------------------"
if node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✅ Database connected'); process.exit(0); }).catch((e) => { console.error('❌ Database connection failed:', e.message); process.exit(1); });" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
else
    echo -e "${YELLOW}⚠️  Database connection test skipped (will check during migration)${NC}"
fi

# Check Redis connection
echo ""
echo "Step 3: Checking Redis Connection"
echo "----------------------------------"
if command -v redis-cli &> /dev/null; then
    if redis-cli -u "$REDIS_URL" ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis connected${NC}"
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        echo "Please check REDIS_URL in .env.production.local"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli not found, skipping Redis check${NC}"
fi

echo ""
echo "Step 4: Installing Dependencies"
echo "--------------------------------"
npm ci --only=production
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo "Step 5: Database Migration"
echo "--------------------------"
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✅ Database migrated${NC}"

echo ""
echo "Step 6: Building Application"
echo "----------------------------"
npm run build
echo -e "${GREEN}✅ Application built${NC}"

echo ""
echo "Step 7: Creating Logs Directory"
echo "--------------------------------"
mkdir -p logs
echo -e "${GREEN}✅ Logs directory created${NC}"

echo ""
echo "Step 8: Starting Services"
echo "-------------------------"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing globally...${NC}"
    npm install -g pm2
fi

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
echo -e "${GREEN}✅ Services started with PM2${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo "================================================"
echo ""
echo "📊 View Logs:"
echo "   pm2 logs"
echo ""
echo "📈 Monitor Services:"
echo "   pm2 monit"
echo ""
echo "🔄 Restart Services:"
echo "   pm2 restart all"
echo ""
echo "🛑 Stop Services:"
echo "   pm2 stop all"
echo ""
echo "🌐 Application URL:"
echo "   $NEXTAUTH_URL"
echo ""
