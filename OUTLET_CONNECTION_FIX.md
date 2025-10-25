# 🔧 Outlet Connection Status Fix - 25 Oktober 2025

## 📋 Problem
Koneksi outlet WhatsApp menjadi terganggu setelah perubahan logger konfigurasi.

## ✅ Solutions Implemented

### 1. **Fixed Baileys Logger Configuration**
**File:** `/src/modules/wa/services/baileys.service.ts` (lines 142-164)

**Issue:** 
- Logger yang sebelumnya `level: 'silent'` mematikan semua event handlers penting
- Ini menyebabkan Baileys tidak dapat memproses connection events dengan baik

**Solution:**
```typescript
logger: {
  level: 'error' as any,
  debug: () => {},      // Silent debug
  info: () => {},       // Silent info
  warn: () => {},       // Silent warn
  error: (msg) => console.error(`[Baileys Error] ${msg}`),  // Show errors only
  trace: () => {},      // Silent trace
  child: () => ({       // Provide child logger
    // Same structure...
  }),
}
```

**Benefits:**
- ✅ Keeps critical errors visible
- ✅ Suppresses verbose connection logs
- ✅ Allows Baileys event handlers to work properly
- ✅ Terminal output remains clean

---

### 2. **New Outlet Connection Status API**
**File:** `/src/app/api/outlets/status/route.ts` (NEW)

**Endpoint:** `GET /api/outlets/status`

**Features:**
- Real-time connection status for all outlets
- Compares DB status vs Live socket status
- Auto-syncs if status mismatch
- Role-based filtering (USER sees own outlet only, ADMIN sees all)

**Response Format:**
```json
{
  "success": true,
  "count": 5,
  "healthy": 4,
  "statuses": [
    {
      "outletId": "outlet_123",
      "outlet": {
        "name": "Outlet Jakarta",
        "whatsappNumber": "6287788987745",
        "isActive": true
      },
      "session": {
        "status": "CONNECTED",
        "sessionName": "Device Name",
        "connectedAt": "2025-10-25T10:30:00Z",
        "lastSeen": "2025-10-25T10:35:00Z",
        "qrCode": "Present",
        "autoReconnect": true,
        "retryCount": 0
      },
      "liveStatus": {
        "status": "CONNECTED",
        "qrCode": null,
        "name": "Device Name"
      },
      "healthy": true
    }
  ]
}
```

**Status Values:**
- `CONNECTED` - ✓ Siap untuk broadcast
- `CONNECTING` - ⟳ Sedang terhubung, tunggu...
- `DISCONNECTED` - ✗ Perlu reconnect
- `PAUSED` - ‖ Sementara dijeda
- `FAILED` - ⚠ Ada error
- `TIMEOUT` - ⏱ Koneksi timeout

---

### 3. **New Outlet Status Dashboard Page**
**File:** `/src/app/outlet-status/page.tsx` (NEW)

**URL:** `http://localhost:3000/outlet-status`

**Features:**
- ✓ Real-time status monitoring
- ✓ Auto-refresh every 10 seconds
- ✓ Summary cards (Total, Healthy, Problem count)
- ✓ Detailed table with all connection info
- ✓ Manual refresh button
- ✓ Responsive design with Bootstrap

**What It Shows:**
| Column | Info |
|--------|------|
| Outlet | Nama outlet |
| No. WhatsApp | Nomor WhatsApp terdaftar |
| Status DB | Status di database |
| Status Live | Status socket aktual |
| Session Name | Nama device WhatsApp |
| Retry Count | Jumlah retry + mode auto/manual |
| Connected At | Waktu terakhir terhubung |
| Last Seen | Waktu terakhir terlihat |
| Health | OK (✓) atau Not OK (✗) |

---

## 🔍 How to Check Connection Status

### Option 1: Web Dashboard (Recommended)
1. Buka `http://localhost:3000/outlet-status`
2. Lihat status real-time semua outlet
3. Auto-refresh setiap 10 detik
4. Klik "🔄 Refresh" untuk manual refresh

### Option 2: API Direct
```bash
# Get status untuk semua outlet
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/outlets/status

# Hasilnya JSON dengan detail setiap outlet
```

### Option 3: Console Logs
```
[Baileys] getSessionStatus live check: DB status=CONNECTED, verified=true, has qrCode=false
[Baileys] verifyLiveConnection: VERIFIED for outlet_123, user: 6287788987745@s.whatsapp.net
```

---

## 🐛 Troubleshooting

### Koneksi di Dashboard tapi tetap Error
**Kemungkinan:** Connection status mismatch

**Solution:**
1. Buka `/outlet-status`
2. Bandingkan "Status DB" vs "Status Live"
3. Jika berbeda, klik "Refresh" button
4. API akan auto-sync status

### Semua Outlet Disconnect
**Kemungkinan:** 
- Network issue
- WhatsApp API limit
- Baileys library issue

**Check:**
1. Buka `/outlet-status` dashboard
2. Lihat "Last Seen" time - apakah recent?
3. Check terminal logs untuk error messages
4. Restart app jika perlu: `npm run dev`

### CONNECTING Status Lama Tidak Berubah
**Kemungkinan:** QR Code ada tapi belum di-scan

**Solution:**
1. Di `/outlets` page, buka modal outlet yang `CONNECTING`
2. Scan QR code baru dengan WhatsApp
3. Tunggu 5-10 detik
4. Refresh `/outlet-status` page
5. Status seharusnya berubah ke `CONNECTED`

---

## 📊 Status Lifecycle

```
DISCONNECTED
    ↓ (user clicks Connect)
CONNECTING
    ↓ (QR scanned)
CONNECTED ←→ PAUSED
    ↓ (network error)
DISCONNECTED
    ↓ (if autoReconnect=true)
CONNECTING
```

---

## ⚙️ Configuration

### Auto-Reconnect Settings
Di database `whatsapp_sessions`:
- `autoReconnect`: true/false - auto retry jika disconnect
- `retryCount`: Current retry count (reset to 0 on success)
- `maxRetries`: Max attempts sebelum stop (default: 3)

### Update Retry Config
```typescript
// Di BaileysService
const maxRetries = 3;      // Max 3 retry attempts
const retryDelay = 3000;   // Wait 3 seconds before retry
```

---

## 🔐 Permissions

**Who can access `/outlet-status`?**
- ✓ SUPERADMIN - Sees all outlets
- ✓ ADMIN - Sees all outlets  
- ✓ USER - Sees only their own outlet
- ✗ Not authenticated - Redirect to login

---

## 📝 Log Format

### Connection Success
```
[Baileys] getSessionStatus live check: DB status=CONNECTED, verified=true, has qrCode=false
[Baileys] verifyLiveConnection: VERIFIED for outlet_123, user: 6287788987745@s.whatsapp.net
```

### Connection Error
```
[Baileys Error] Stream Errored (conflict)
[Baileys] Database says CONNECTED but socket verification failed, syncing to DISCONNECTED
```

### Auto-Sync
```
[Baileys] Socket verification shows CONNECTED but DB says CONNECTING for outlet_123, syncing to CONNECTED
```

---

## 📋 Checklist

- ✅ Baileys logger fixed (only show errors)
- ✅ Terminal output cleaner
- ✅ API endpoint created for status check
- ✅ Web dashboard created
- ✅ Auto-refresh every 10 seconds
- ✅ Auto-sync DB vs Live status
- ✅ Role-based access control
- ✅ TypeScript compilation: 0 errors
- ✅ Responsive UI with Bootstrap

---

## 🚀 Next Steps

1. **Test Connection Status**
   - Go to `/outlet-status`
   - Verify all outlets show correct status
   - Check if auto-refresh works

2. **If Disconnect Issue**
   - Check `/outlet-status` dashboard
   - Verify "Status Live" column shows actual status
   - Rescan QR if showing CONNECTING

3. **Monitor Connection**
   - Keep `/outlet-status` page open while using app
   - Watch for unexpected disconnections
   - Check logs for error messages

---

**Last Updated:** 25 Oktober 2025  
**Status:** ✅ Ready for Testing  
**TypeScript:** 0 errors  
**Next:** Monitor outlet connections via dashboard
