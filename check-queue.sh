#!/bin/bash

# Check Redis Queue Status
# Shows all jobs in BullMQ queue

echo "🔍 Checking BullMQ Queue Status..."
echo ""

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
  echo "❌ Redis is not running!"
  echo "Start Redis with: brew services start redis"
  exit 1
fi

echo "✅ Redis is running"
echo ""

# Count jobs by state
echo "📊 Job Counts:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WAITING=$(redis-cli LLEN "bull:blast-queue:wait" 2>/dev/null || echo "0")
ACTIVE=$(redis-cli LLEN "bull:blast-queue:active" 2>/dev/null || echo "0")
COMPLETED=$(redis-cli ZCARD "bull:blast-queue:completed" 2>/dev/null || echo "0")
FAILED=$(redis-cli ZCARD "bull:blast-queue:failed" 2>/dev/null || echo "0")

echo "⏳ Waiting (QUEUED):     $WAITING"
echo "⚡ Active (PROCESSING):  $ACTIVE"
echo "✅ Completed:            $COMPLETED"
echo "❌ Failed:               $FAILED"
echo ""

# Show all queue keys
echo "📋 All Queue Keys:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
redis-cli KEYS "bull:blast-queue:*" | head -20

echo ""
echo "💡 Tip: Use 'redis-cli' for detailed inspection"
