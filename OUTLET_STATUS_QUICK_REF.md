# 🎯 Outlet Connection Status - Quick Reference

## 🔗 Access Points

### 1. Status Dashboard (Real-time Monitor)
```
URL: http://localhost:3000/outlet-status
Auto-refresh: Every 10 seconds
Access: All authenticated users (role-based filtering)
```

### 2. API Endpoint
```
GET /api/outlets/status

Response:
{
  "success": true,
  "count": 5,
  "healthy": 4,
  "statuses": [...]
}
```

---

## 📊 Status Meanings

| Status | Icon | Meaning | Action |
|--------|------|---------|--------|
| **CONNECTED** | ✓ | Ready for broadcast | Use outlet |
| **CONNECTING** | ⟳ | Waiting for QR scan | Scan QR in modal |
| **DISCONNECTED** | ✗ | Outlet offline | Reconnect manually |
| **PAUSED** | ‖ | Temporarily disabled | Resume connection |
| **FAILED** | ⚠ | Error occurred | Check error message |
| **TIMEOUT** | ⏱ | Network timeout | Wait or reconnect |

---

## 🚀 Common Tasks

### Check All Outlet Status
1. Go to `/outlet-status`
2. View status dashboard
3. Check "Health" column (✓ = healthy, ✗ = problem)

### Reconnect Disconnected Outlet
1. Go to `/outlets` page
2. Find disconnected outlet (marked as ✗)
3. Click "Koneksikan" button
4. Scan QR code with WhatsApp
5. Status should change to ✓ in 5-10 seconds

### View Connection Details
**On `/outlet-status` page, each row shows:**
- Outlet name & phone number
- Database status vs Live status
- Device name (session name)
- When it connected & last seen
- Retry count & auto-reconnect status

### Broadcast via Blast
1. Ensure outlets are ✓ CONNECTED (check `/outlet-status`)
2. Go to `/blast` page
3. Select outlets to send (or "Semua Outlets")
4. Type message
5. Click Preview then Send

---

## ⚙️ Quick Debug

### Terminal Logs to Watch
```bash
# Success
[Baileys] getSessionStatus live check: ... verified=true

# Error
[Baileys Error] Stream Errored (conflict)

# Auto-sync
[Baileys] syncing to CONNECTED
```

### If Something Feels Wrong
1. Open `/outlet-status` page
2. Check if "Status DB" ≠ "Status Live"
3. If mismatch → Click Refresh button
4. API auto-syncs status
5. Refresh page if needed

---

## 📱 Mobile Status Check

Via API (can use in mobile app):
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/outlets/status
```

Response includes all outlet details in JSON format.

---

## 🔒 Access Control

| Role | Can See |
|------|---------|
| **SUPERADMIN** | All outlets |
| **ADMIN** | All outlets |
| **USER** | Own outlet only |

---

## ✅ Health Check Criteria

An outlet is marked **✓ Healthy** if:
1. Database status = `CONNECTED`
2. Live socket verification = `CONNECTED`
3. WebSocket connection is open
4. User ID is present in socket
5. Auto-reconnect is enabled

If any criteria fails → **✗ Not OK**

---

## 🔄 Auto Features

| Feature | What It Does |
|---------|-------------|
| **Auto-refresh** | Dashboard updates every 10 seconds |
| **Auto-sync** | API syncs DB status vs Live status |
| **Auto-reconnect** | Socket auto-reconnects if disconnect (if enabled) |
| **Manual Refresh** | 🔄 Button on top-right of dashboard |

---

## 📞 Status API Response Example

```json
{
  "success": true,
  "count": 2,
  "healthy": 1,
  "statuses": [
    {
      "outletId": "outlet_123",
      "outlet": {
        "name": "Jakarta Store",
        "whatsappNumber": "6287788987745",
        "isActive": true
      },
      "session": {
        "status": "CONNECTED",
        "sessionName": "iPhone 12",
        "connectedAt": "2025-10-25T10:30:00Z",
        "lastSeen": "2025-10-25T10:35:00Z",
        "qrCode": null,
        "autoReconnect": true,
        "retryCount": 0
      },
      "liveStatus": {
        "status": "CONNECTED",
        "qrCode": null,
        "name": "iPhone 12"
      },
      "healthy": true
    },
    {
      "outletId": "outlet_456",
      "outlet": {
        "name": "Bandung Store",
        "whatsappNumber": "62812345678",
        "isActive": false
      },
      "session": {
        "status": "DISCONNECTED",
        "sessionName": null,
        "connectedAt": null,
        "lastSeen": "2025-10-25T09:00:00Z",
        "qrCode": "Present",
        "autoReconnect": true,
        "retryCount": 2
      },
      "liveStatus": {
        "status": "CONNECTING",
        "qrCode": "Present",
        "name": null
      },
      "healthy": false
    }
  ]
}
```

---

## 🎯 Status on Blast Page

When broadcasting:
- ✓ Only send to outlets with `healthy: true`
- ⏳ CONNECTING outlets will fail (wait for CONNECTED)
- ✗ DISCONNECTED outlets will fail (need reconnect)

---

## 🔧 Files Created/Modified

| File | Type | Purpose |
|------|------|---------|
| `/src/app/api/outlets/status/route.ts` | NEW API | Check outlet status |
| `/src/app/outlet-status/page.tsx` | NEW Page | Dashboard UI |
| `/src/modules/wa/services/baileys.service.ts` | MODIFIED | Logger fix |

---

## 🚨 Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---------|------------|-----|
| All outlets ✗ | Network down | Check internet connection |
| Some outlets ✗ | Session expired | Rescan QR code |
| Status DB ≠ Live | Sync mismatch | Click Refresh on dashboard |
| CONNECTING stuck | QR not scanned | Scan QR with WhatsApp app |
| Broadcast fails but status ✓ | Permission issue | Check outlet access rights |

---

**Dashboard URL:** http://localhost:3000/outlet-status  
**Status Check:** Real-time, auto-refresh every 10 sec  
**Last Built:** 25 Oktober 2025  
**Ready:** ✅ Yes
