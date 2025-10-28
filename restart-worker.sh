#!/bin/bash

# Restart Worker Script
# Kills old worker and starts new one

echo "🔄 Restarting Worker..."

# Kill old worker process
echo "🛑 Stopping old worker..."
pkill -f "tsx worker.ts" || echo "No worker running"

# Wait a bit
sleep 1

# Start new worker
echo "▶️  Starting new worker..."
npm run worker &

# Wait for worker to start
sleep 2

# Check if worker is running
if ps aux | grep -v grep | grep "tsx worker.ts" > /dev/null; then
    echo "✅ Worker started successfully!"
    echo ""
    echo "📊 Monitor worker:"
    echo "   - Check logs in terminal"
    echo "   - Run: node debug-blast.js"
    echo "   - Run: ./check-queue.sh"
else
    echo "❌ Worker failed to start"
    exit 1
fi
