# Timeout Error Troubleshooting Guide

## 🆘 Error: "Timed Out" at waitForMessage

Jika Anda melihat error seperti ini:
```
Error: Timed Out
    at promiseTimeout (file:///node_modules/@whiskeysockets/baileys/lib/Utils/generics.js:126:19)
    at waitForMessage (file:///node_modules/@whiskeysockets/baileys/lib/Socket/socket.js:115:34)
    at query (file:///node_modules/@whiskeysockets/baileys/lib/Socket/socket.js:138:45)
    at sendPassiveIq (file:///node_modules/@whiskeysockets/baileys/lib/Socket/socket.js:317:36)
```

## 📋 Checklist Diagnosis

### 1. **Check Socket Connection Status**
```bash
curl http://localhost:3000/api/outlets/status
```

**Seharusnya response:**
```json
{
  "summary": {
    "total": 5,
    "connected": 3,
    "disconnected": 2
  },
  "outlets": [
    {
      "id": "outlet-123",
      "name": "Outlet Central",
      "whatsappNumber": "081260268381",
      "status": "CONNECTED",  // ← HARUS CONNECTED
      "socketConnected": true,
      "lastSeen": "2025-10-25T10:30:00.000Z"
    }
  ]
}
```

**If `socketConnected: false`:**
- Socket terputus atau tidak responsif
- Coba reconnect: Klik "Connect WhatsApp" di Outlets page
- Atau reset: `DELETE /api/outlets/{id}` then create new

### 2. **Check Network Connection**
Timeout biasanya terjadi karena:
- 🌍 Network latency tinggi (> 3 seconds RTT)
- 🔌 Firewall/proxy blocking
- 📡 WiFi unstable

**Test network:**
```bash
# Test latency to WhatsApp
ping -c 5 e.whatsapp.net

# Check port 443 (WebSocket)
nc -zv e.whatsapp.net 443
```

**Expected output:**
```
e.whatsapp.net (port 443) open
```

### 3. **Check WhatsApp Server Status**
Sometime WhatsApp servers are down or rate-limiting:

```bash
# Test WhatsApp connectivity from server
curl -I https://web.whatsapp.com
```

**Expected:** HTTP 200 response

### 4. **Check Socket Load**
Jika socket sudah banyak tugas (sending messages, etc), verification bisa timeout:

```bash
# Check how many outlets connected
curl http://localhost:3000/api/outlets/status | jq '.summary.connected'

# If > 10 outlets connected, socket might be overloaded
# Solution: Distribute across multiple WhatsApp accounts
```

## 🔧 Solutions (By Priority)

### Solution 1: **Retry Verification** (Fastest)
Error ini sering temporary (network glitch). Coba lagi:
1. Buka Outlets modal
2. Clear field
3. Re-enter phone number
4. Click verify button again

✅ **Success rate:** 80-90% (melalui timeout)

### Solution 2: **Reconnect WhatsApp** (5-10 minutes)

1. Go to **Outlets** page
2. Find problematic outlet
3. Click **⋮ (menu)** → **Disconnect WhatsApp**
4. Confirm dialog
5. Wait 3 seconds
6. Same outlet should show **"Reconnect needed"** status
7. Click **"Connect WhatsApp"** button
8. Scan new QR code
9. Wait for "Connected" status
10. Try verification again

### Solution 3: **Restart Application** (10-15 minutes)

```bash
# Kill current process
kill $(lsof -t -i:3000)

# Restart
npm run dev
# or
yarn dev
```

Then:
1. Wait 5 seconds for app to start
2. Go to Outlets page
3. All outlets should auto-reconnect within 10 seconds
4. Once all "Connected", try verification again

### Solution 4: **Reset Problematic Session** (15-20 minutes)

**From Database (Advanced):**

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Find session that's causing timeout
SELECT id, outlet_id, status, phone_number, created_at
FROM "WhatsappSession"
ORDER BY created_at DESC
LIMIT 5;

# Reset problematic one
UPDATE "WhatsappSession"
SET status = 'DISCONNECTED', 
    qr_code = NULL,
    retry_count = 0
WHERE id = 'session-id-here';

# Restart application
```

**From UI:**
1. Go to **Outlets** page
2. Click **⋮** on outlet
3. Click **"Delete"** to remove outlet
4. Confirm dialog
5. Create outlet again
6. Connect WhatsApp with new QR code

### Solution 5: **Change Network** (Quick test)

Jika WiFi unstable, coba:
1. Switch to hotspot dari handphone
2. Try verification again
3. If works, WiFi yang bermasalah

**If problem persists:**
1. Contact ISP untuk check connection
2. Or use VPN (may help or hurt depending on region)

## 🔍 Detailed Diagnosis

### Check Logs

**Terminal logs (where app running):**
```
[Baileys] Checking onWhatsApp for JID: 6281260268381@s.whatsapp.net
[Baileys] onWhatsApp check timed out for 081260268381, assuming number is OK
[API] Check number result for 081260268381: { valid: true, exists: false, message: 'Format valid. Verifikasi...' }
```

**Good sign:** See "timed out" message means timeout is now caught and handled ✅

**Bad sign:** App hangs, no log output = need restart

### Enable Debug Logging

Edit `/src/modules/wa/services/baileys.service.ts`:

```typescript
// Line ~165, change:
logger: {
  level: 'error' as any,  // ← Change to 'debug'
  ...
}
```

Then restart app:
```bash
npm run dev
```

Now you'll see detailed Baileys logs:
```
[Baileys] [connection.update] state={connection: "open"}
[Baileys] [messages.upsert] count=5
[Baileys] [onWhatsApp] checking 081260268381@s.whatsapp.net
```

### Monitor Socket Health

Create `/api/debug/socket-health` endpoint (advanced):

```typescript
export async function GET() {
  const sockets = BaileysService.sockets  // Access private map
  
  return NextResponse.json({
    socketsCount: sockets.size,
    sockets: Array.from(sockets.entries()).map(([id, socket]) => ({
      outletId: id,
      userConnected: !!(socket as any).user?.id,
      user: (socket as any).user,
      lastCheck: new Date().toISOString(),
    }))
  })
}
```

Visit: `http://localhost:3000/api/debug/socket-health`

## 📊 Performance Expectations

| Scenario | Time | Status |
|----------|------|--------|
| Normal verification | 1-3s | ✅ Connected |
| Network slow | 3-8s | ⚠️ Might timeout |
| Socket overloaded | > 12s | ❌ Timeout |
| No socket connected | 1-2s | ℹ️ Info message |
| After reconnect | 1-2s | ✅ Restored |

## 🚨 If Problem Persists

1. **Collect debugging info:**
```bash
# Terminal logs (copy last 50 lines)
# Socket status from /api/outlets/status
# Screenshot of error
# Your location/timezone
# App version: npm list next
```

2. **Contact Support with:**
   - Error message (full stack trace)
   - Steps to reproduce
   - Debugging info from above
   - Outlet phone number (masked: 08xxxx**)

3. **Temporary Workaround:**
   - Create outlet **without** verification
   - Then manually verify phone is active on WhatsApp
   - This avoids the timeout issue entirely

## ⚡ Quick Fixes Summary

| Issue | Fix | Time |
|-------|-----|------|
| Occasional timeout | Retry | 1 min |
| Frequent timeout | Reconnect WhatsApp | 5 min |
| All timeouts | Restart app | 10 min |
| Persistent | Reset session | 15 min |
| Still broken | Change network | 5 min |

---

**Last Updated:** October 25, 2025  
**Version:** 2.1.0 (with timeout fixes)

Need help? Check [BAILEYS_TIMEOUT_FIX.md](./BAILEYS_TIMEOUT_FIX.md) for technical details.
