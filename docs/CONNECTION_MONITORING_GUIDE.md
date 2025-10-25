# Connection Status Monitoring & Debugging

## 📊 Real-time Status Monitoring

### Via API

```bash
# Check status of all outlets
curl -H "Authorization: Bearer [token]" \
  http://localhost:3000/api/outlets/status

# Expected output:
{
  "success": true,
  "count": 3,
  "healthy": 2,
  "timestamp": "2025-10-25T10:30:00.000Z",
  "statuses": [
    {
      "outletId": "outlet-1",
      "outlet": {
        "name": "Outlet Central",
        "whatsappNumber": "081260268381",
        "isActive": true
      },
      "session": {
        "status": "CONNECTED",
        "sessionName": "User Name",
        "connectedAt": "2025-10-25T10:25:00.000Z",
        "qrCode": null,
        "retryCount": 0
      },
      "liveStatus": {
        "status": "CONNECTED",
        "name": "User Name"
      },
      "healthy": true
    }
  ]
}
```

### Via Dashboard

Go to: `http://localhost:3000/outlet-status`

Shows:
- Summary: Total outlets, connected outlets
- Live table: Status, QR code, connection time
- Auto-refresh: Every 10 seconds
- Manual refresh button

## 🔍 Understanding Logs

### Connection Sequence (Normal)

```
1. [Connection Update] Outlet outlet-1: connection=connecting
   └─ Device started connecting

2. [Connection Update] Outlet outlet-1: connection=connecting, qr=true
   └─ QR code generated, waiting for scan

3. [Connection Update] Outlet outlet-1: connection=open
   └─ Device authenticated!

4. [Connection Update] Socket opened for outlet outlet-1, user: 6281260268381@s.whatsapp.net
   └─ Socket ready, got user info

5. [Connection Update] WhatsappSession marked CONNECTED for outlet outlet-1
   └─ DB updated

6. [Status API] Live status for outlet-1: CONNECTED
   └─ Status verified and returned
```

### When You See These Logs

#### ✅ GOOD - All Normal
```
[Connection Update] WhatsappSession marked CONNECTED for outlet-1
[Baileys] getSessionStatus: No sync needed (status matches)
[Status API] Outlet outlet-1: healthy=true
```

#### ⚠️ WARNING - DB Out of Sync
```
[Baileys] SYNC NEEDED: Socket verification shows CONNECTED but DB says CONNECTING for outlet-1
[Baileys] Outlet marked CONNECTED for outlet-1
[Baileys] After sync: status=CONNECTED
```
→ **Means:** DB was not updated properly, but we auto-corrected it.

#### ❌ ERROR - Connection Failed
```
[Baileys Error] {"code":"ERR_WS_ALREADY_OPEN","message":"Connection already open"}
[Connection Update] Socket closed for outlet-1, statusCode: undefined
[Connection Update] WhatsappSession marked DISCONNECTED for outlet-1
```
→ **Means:** Connection failed and was closed.

### Error Code Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `ERR_WS_ALREADY_OPEN` | Socket already connecting | Disconnect and retry |
| `ERR_WS_CONNECTION_FAILED` | Network error | Check internet connection |
| `LOGGED_OUT` | User logged out | Reconnect WhatsApp |
| `NETWORK_TIMEOUT` | No response from WhatsApp | Retry (usually temporary) |
| `UNKNOWN` | Unknown error | Check Baileys logs |

## 🧪 Testing Connection States

### Test 1: Connect WhatsApp
```bash
# Terminal
# Watch logs for connection sequence above
tail -f logs/app.log | grep "\[Connection Update\]"

# Browser
# Open http://localhost:3000/outlet-status
# Should see status update to CONNECTED within 1-2 seconds
```

### Test 2: Disconnect Device
```bash
# Terminal
# Should see:
[Connection Update] Socket closed for outlet-1, statusCode: 20
[Connection Update] WhatsappSession marked DISCONNECTED for outlet-1

# Browser
# Status should update to DISCONNECTED within 1-2 seconds
```

### Test 3: Force Sync Check
```bash
# This happens automatically, but you can trigger it:
# Edit a session status manually, then refresh status page
# System should detect mismatch and auto-correct:
[Baileys] SYNC NEEDED: ...
```

### Test 4: Multiple Outlets
```bash
# Connect 2+ outlets simultaneously
# Each should show CONNECTED within 1-2 seconds
# Check status API returns all outlets correctly
```

## 🔧 Debugging Checklist

### If Status Not Updating

- [ ] Check terminal logs for connection events
- [ ] Verify API endpoint is working: `GET /api/outlets/status`
- [ ] Check browser network tab (should see API response in <2s)
- [ ] Verify WhatsApp actually scanned QR
- [ ] Check database:
  ```sql
  SELECT outlet_id, status, last_seen FROM "WhatsappSession" 
  WHERE outlet_id = 'outlet-1' 
  ORDER BY last_seen DESC LIMIT 1;
  ```
  Should show status=CONNECTED

### If Error Messages Are Unclear

- [ ] Check you're running latest code
- [ ] Verify logger is set to 'error' level
- [ ] Restart application
- [ ] Look for `[Baileys Error]` in logs - should now be JSON

### If Getting [object Object]

- [ ] Old code still running
- [ ] Restart application: `killall node`
- [ ] Verify fix is in baileys.service.ts lines 150-170

### If Status Keeps Switching

- [ ] Indicates unstable connection
- [ ] Check WiFi signal strength
- [ ] Check WhatsApp account for logging out
- [ ] Try disconnecting and reconnecting
- [ ] Check network latency to WhatsApp servers

## 📈 Monitoring Metrics

### Health Checks

```bash
# Check via API
curl -H "Authorization: Bearer [token]" \
  http://localhost:3000/api/outlets/status \
  | jq '.healthy / .count'

# If result is < 0.8 (80% healthy), investigate
```

### Key Metrics to Track

1. **Healthy %** = healthy outlets / total outlets
   - Target: > 95%

2. **Status Update Time** = time until `healthy=true` appears
   - Target: < 1 second

3. **Error Frequency** = `[Baileys Error]` messages per minute
   - Target: 0-1 per minute

4. **SYNC NEEDED Frequency** = auto-corrected mismatches per hour
   - Target: < 5 per hour

## 🚨 Alert Conditions

### Red Alert 🔴
```
- Healthy % drops below 50%
- Status update time > 5 seconds
- Repeated [Baileys Error] messages
- Multiple SYNC NEEDED logs per minute
```

### Yellow Alert 🟡
```
- Healthy % drops below 80%
- Status update time > 2 seconds
- Occasional [Baileys Error]
- SYNC NEEDED logs once per hour
```

### Green ✅
```
- Healthy % > 95%
- Status update time < 1 second
- No [Baileys Error] (or very rare)
- No SYNC NEEDED logs
```

## 🔍 Common Issues & Solutions

### Issue: "Status shows CONNECTED but messages won't send"
**Cause:** Socket appears connected but not fully ready  
**Solution:**
```bash
# Disconnect and reconnect
curl -X POST http://localhost:3000/api/outlets/{id}/disconnect

# Then reconnect via UI
```

### Issue: "Getting [Baileys Error] [object Object]"
**Cause:** Old code not reflecting fix  
**Solution:**
```bash
# Restart app
killall node
npm run dev
```

### Issue: "Status takes 5+ seconds to update"
**Cause:** DB slow or network latency  
**Solution:**
```bash
# Check DB performance
# Check database connection pool settings
# Check network latency to WhatsApp
```

### Issue: "SYNC NEEDED appears frequently"
**Cause:** Race condition between socket and DB  
**Solution:**
```bash
# Already auto-corrected, but indicates timing issue
# May need to increase delay from 500ms to 1000ms
# File: baileys.service.ts line 335
```

## 📊 Log Analysis Script

```bash
#!/bin/bash
# Analyze recent logs for issues

echo "=== Connection Success Rate ==="
grep "\[Connection Update\] Socket opened" app.log | wc -l
echo "successful connections"

echo ""
echo "=== Failed Connections ==="
grep "\[Connection Update\] Socket closed" app.log | tail -5

echo ""
echo "=== Error Frequency ==="
grep "\[Baileys Error\]" app.log | wc -l
echo "errors total"

echo ""
echo "=== Sync Issues ==="
grep "SYNC NEEDED" app.log | wc -l
echo "sync corrections needed"

echo ""
echo "=== Status API Performance ==="
grep "\[Status API\]" app.log | tail -10
```

## 🎯 Performance Baseline

After fix, you should see:

```
[Status API] Request from user abc123 (SUPERADMIN)
[Status API] ADMIN sees 5 outlets
[Status API] Fetching status for outlet-1...
[Status API] Getting live status for outlet-1...
[Status API] Live status for outlet-1: CONNECTED
[Status API] Outlet outlet-1: healthy=true
[Status API] Response: 5 outlets, 5 healthy
```

**Timing:**
- Total API response: < 2 seconds
- Per outlet check: < 300ms
- DB query: < 50ms
- Socket verification: < 100ms

---

**Last Updated:** October 25, 2025  
**Version:** 2.2.0
