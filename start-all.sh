#!/bin/bash

# Start Next.js dev server dan Worker secara bersamaan
# Gunakan: npm run dev:all

echo "🚀 Starting Next.js + Worker..."
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping all processes..."
  kill $NEXT_PID $WORKER_PID 2>/dev/null
  exit
}

trap cleanup SIGINT SIGTERM

# Start Next.js dev server
echo "📦 Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

# Wait for Next.js to be ready
sleep 3

# Start Worker
echo "⚙️  Starting background worker..."
npm run worker &
WORKER_PID=$!

echo ""
echo "✅ All services started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Next.js:  http://localhost:3000"
echo "⚙️  Worker:   Running (PID: $WORKER_PID)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for background processes
wait $NEXT_PID $WORKER_PID
