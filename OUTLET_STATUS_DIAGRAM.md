# Outlet Connection Status Flow

## 📡 Live Status Verification Process

```
User opens /outlet-status
        ↓
Browser requests /api/outlets/status
        ↓
API checks each outlet:
    ├─ Get outlet info from DB
    ├─ Get session info from DB
    ├─ Get live socket verification
    │   ├─ Is socket in memory? ✓
    │   ├─ Does socket have user.id? ✓
    │   ├─ Is WebSocket open (readyState=1)? ✓
    │   └─ Result: CONNECTED or DISCONNECTED
    │
    ├─ Compare DB status vs Live status
    │   ├─ If same → ✓ Status correct
    │   └─ If different → Auto-sync to correct value
    │
    └─ Return detailed status object
        ↓
Dashboard displays real-time status
        ↓
Auto-refresh every 10 seconds
```

---

## 🔄 Status Sync Logic

```
┌─────────────────────────────────┐
│ Check Outlet Connection Status  │
└─────────────────────────────────┘
            ↓
        ┌───────────────────┐
        │ DB Status?        │
        └────┬──────────────┘
             ├─ CONNECTED
             ├─ CONNECTING
             ├─ DISCONNECTED
             ├─ FAILED
             └─ TIMEOUT
            ↓
        ┌───────────────────┐
        │ Live Verify OK?   │ (socket check)
        └─┬─────────────┬───┘
          │             │
         YES            NO
          ↓              ↓
    ✓ Healthy      ✗ Problem
    Status OK      Need Sync
          ↓              ↓
       Show ✓        Auto-sync to
       Healthy      DISCONNECTED
```

---

## 🎯 Dashboard Display

```
┌─────────────────────────────────────────────────────────────┐
│  Status Koneksi Outlet WhatsApp                   🔄 Refresh│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Total       │  │ Terhubung   │  │ Bermasalah  │         │
│  │     5       │  │      4      │  │      1      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Outlet    │ No WA  │ Status DB │ Status Live │ Health      │
├───────────┼────────┼───────────┼─────────────┼─────────────┤
│ Jakarta   │ 628777 │ ✓ CONN    │ ✓ CONN      │ ✓ OK        │
│ Bandung   │ 628123 │ ✗ DISCON  │ ✗ DISCON    │ ✗ Not OK    │
│ Surabaya  │ 628456 │ ✓ CONN    │ ✓ CONN      │ ✓ OK        │
│ Medan     │ 628789 │ ⟳ CONNEC  │ ⟳ CONNEC    │ ✗ Not OK    │
│ Semarang  │ 628999 │ ✓ CONN    │ ✓ CONN      │ ✓ OK        │
└───────────┴────────┴───────────┴─────────────┴─────────────┘

Last refresh: 10:35:42
```

---

## 🔌 Socket State Machine

```
┌──────────────┐
│  NO SOCKET   │
└──────┬───────┘
       │ User clicks "Connect"
       ↓
┌──────────────┐
│  CONNECTING  │ (waiting for QR scan)
└──────┬───────┘
       │ QR scanned
       ↓
┌──────────────┐
│  CONNECTED   │ ← Ready to use
└──────┬───────┘
       │ Network error / User action
       ↓
┌──────────────┐
│DISCONNECTED  │
└──────┬───────┘
       │ if autoReconnect=true
       ↓
┌──────────────┐
│  CONNECTING  │ (auto retry)
└──────────────┘
       ↓
    (back to CONNECTED or FAILED)
```

---

## 🎯 API Call Sequence

```
1. Client: GET /api/outlets/status
                    ↓
2. Server: Check auth (getServerSession)
                    ↓
3. Server: Get outlets (filter by role)
   - USER: own outlet only
   - ADMIN/SUPERADMIN: all outlets
                    ↓
4. For each outlet, do:
   a) Get outlet info from DB
   b) Get session info from DB
   c) Get live socket status
      - Is socket in memory?
      - Socket has user.id?
      - WebSocket open?
   d) Compare & sync if needed
   e) Build response object
                    ↓
5. Return JSON response
                    ↓
6. Client: Render dashboard UI
   - Summary cards
   - Status table
   - Auto-refresh timer
```

---

## 🔐 Role-Based Access

```
┌────────────────────────────────┐
│ GET /api/outlets/status        │
└──────────────┬─────────────────┘
               │ Authenticate
               ↓
     ┌─────────┴──────────┐
     │ Check User Role    │
     └──────┬──────┬──────┘
            │      │
         USER    ADMIN/SUPERADMIN
         (own)    (all)
            │      │
    ┌───────┘      └────────────┐
    ↓                            ↓
Get outlet_id          Get all outlet_ids
from user.outletId     from outlets table
    ↓                            ↓
Return status for      Return status for
1 outlet               all outlets
```

---

## 📊 Status Response Structure

```json
{
  "success": true,
  "count": 5,                    // Total outlets
  "healthy": 4,                  // Outlets with ✓ status
  "statuses": [
    {
      "outletId": "...",
      
      "outlet": {                // Outlet info
        "name": "Jakarta",
        "whatsappNumber": "628...",
        "isActive": true
      },
      
      "session": {               // DB session status
        "status": "CONNECTED",
        "sessionName": "iPhone",
        "connectedAt": "2025-10-25T10:30:00Z",
        "lastSeen": "2025-10-25T10:35:00Z",
        "qrCode": null,          // null = no QR, "Present" = has QR
        "autoReconnect": true,
        "retryCount": 0
      },
      
      "liveStatus": {            // Live socket verification
        "status": "CONNECTED",
        "qrCode": null,
        "name": "iPhone"
      },
      
      "healthy": true            // Overall health: ✓ or ✗
    }
  ]
}
```

---

## 🔄 Auto-Refresh Mechanism

```
┌──────────────────────────────────┐
│ Dashboard Page Loaded            │
└────────────┬─────────────────────┘
             │
             ├─ Fetch status immediately
             │
             └─ Set interval (10 seconds)
                    │
                    ├─ Call /api/outlets/status
                    │
                    ├─ Update React state
                    │
                    ├─ Re-render table
                    │
                    └─ Wait 10 seconds
                           │
                    (loop back to "Call /api")
```

---

## ✅ Health Check Algorithm

```
isHealthy = 
  (dbStatus === "CONNECTED") AND
  (liveStatus === "CONNECTED") AND
  (socketHasUser) AND
  (websocketOpen) AND
  (autoReconnect)

if (isHealthy) → ✓ OK
else           → ✗ Not OK
```

---

## 🎯 Troubleshooting Flowchart

```
                    Start
                      ↓
        Is outlet ✓ on dashboard?
               ↙      ↘
             YES       NO
              ↓         ↓
          OK✓    Check Live Status
                      ↓
              Compare DB vs Live
                 ↙         ↘
            Same       Different
              ↓             ↓
           OK✓         Click Refresh
                        (auto-sync)
                            ↓
                     Check again ↓
                        Same ✓
```

---

## 📱 Integration with Blast Page

```
User on /blast page
        ↓
Select outlets to send
        ↓
Get selected outlet IDs
        ↓
Check each outlet status (internal):
    ├─ Is healthy? ✓ → Can send
    ├─ Is healthy? ✗ → Show warning
    └─ Is CONNECTING? → Show wait message
        ↓
User clicks "Send"
        ↓
For each healthy outlet:
    └─ Send messages via Baileys
        ↓
Show results in UI
```

---

## 🔧 Logger Flow

```
Baileys Library Event
        ↓
├─ debug/info/warn/trace → Silent ✓
│
├─ error → Log to console with [Baileys Error] prefix
│
└─ child() → Return child logger (same structure)
        ↓
Terminal shows only critical errors
Clean output ✓
Events still processed ✓
```

---

This diagram shows:
- How status checking works
- Data flow through API
- Role-based access control
- Auto-refresh mechanism
- Health check logic
- Integration points
