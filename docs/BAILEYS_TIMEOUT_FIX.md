# Baileys Timeout Error Fix

## 🔴 Problem
Ketika user melakukan verifikasi nomor WhatsApp, aplikasi menampilkan error:
```
Error: Timed Out
    at file:///node_modules/@whiskeysockets/baileys/lib/Utils/generics.js:131:32
    at waitForMessage (file:///node_modules/@whiskeysockets/baileys/lib/Socket/socket.js:115:34)
```

**Gejala:**
- Error muncul meski device WhatsApp sudah terkoneksi (`socket.user.id` ada)
- Timeout terjadi pada method `onWhatsApp()` saat melakukan IQ query
- Error status: 408 Request Time-out

## 🔍 Root Cause

### 1. **Socket Timeout pada `onWhatsApp()` Call**
Method `onWhatsApp()` di Baileys melakukan IQ query ke server WhatsApp dan menunggu response. Jika:
- Network/connection lambat
- Server WhatsApp sedang overloaded
- Query get stuck
- Connection state tidak konsisten

...maka akan terjadi timeout 30 detik default dari Baileys.

### 2. **Tidak Ada Timeout Handling**
Original code tidak memiliki timeout wrapper atau fallback untuk operasi `onWhatsApp()`:
```typescript
// ❌ OLD: Bisa hang indefinitely atau timeout tanpa graceful fallback
const results = await (connectedSocket as any).onWhatsApp(jid)
```

### 3. **Tidak Ada Retry Mechanism**
Jika sekali timeout, langsung gagal. Tidak ada retry logic untuk network flakiness.

## ✅ Solution Implemented

### 1. **Service Layer Timeout (baileys.service.ts)**
```typescript
// ✅ NEW: Add 12-second timeout wrapper
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout: onWhatsApp check exceeded 12s')), 12_000)
})

// Race between actual call and timeout
const results = await Promise.race([
  (connectedSocket as any).onWhatsApp(jid),
  timeoutPromise
]) as any[]
```

**Benefits:**
- Prevents indefinite hanging
- 12s timeout (more aggressive than Baileys 30s) means faster user feedback
- If timeout, gracefully returns valid number (user can proceed manually)

### 2. **API Layer Timeout (check-number/route.ts)**
```typescript
// ✅ NEW: Add 30-second API timeout wrapper
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('API timeout')), 30_000)
})

const result = await Promise.race([
  baileysService.checkPhoneNumberValid(whatsappNumber),
  timeoutPromise
])
```

**Benefits:**
- Catches service timeouts at API level
- Returns user-friendly message
- Prevents HTTP request hanging

### 3. **Graceful Fallback**
Jika timeout terjadi, sistem:
1. Logs warning (bukan error)
2. Returns `valid: true, exists: false`
3. Message: "Format valid. Verifikasi WhatsApp sedang diproses..."
4. User dapat lanjutkan atau coba lagi

## 🔧 Technical Details

### Files Modified:
1. **`/src/modules/wa/services/baileys.service.ts`** (lines 585-620)
   - Added 12s timeout wrapper on `onWhatsApp()` call
   - Graceful error handling for timeout scenarios

2. **`/src/app/api/outlets/check-number/route.ts`** (lines 7-50)
   - Added 30s timeout wrapper on service call
   - Better error messages for timeout cases

### Error Handling Flow:
```
User checks phone number
    ↓
API calls baileysService.checkPhoneNumberValid()
    ↓
Service finds connected socket
    ↓
Service calls onWhatsApp() with 12s timeout
    ├─ ✓ Success (< 12s): Return actual status
    └─ ✗ Timeout (> 12s): Return valid=true, exists=false
    ↓
API checks result with 30s timeout
    ├─ ✓ Success: Return result
    └─ ✗ Timeout: Return graceful message
    ↓
Client receives response
    ├─ If exists=true: Show "✓ Nomor aktif"
    ├─ If exists=false & message has "Silakan hubungkan": Show info card + link
    └─ If exists=false & message has "timeout": Show retry message
```

## 📊 Impact

| Scenario | Before | After |
|----------|--------|-------|
| **Normal verification** | Works fine | ✅ Works fine (same) |
| **Slow network** | Hangs/Timeout | ✅ Returns in 12s with fallback |
| **Socket overloaded** | 408 Error | ✅ Graceful "sedang diproses" message |
| **API timeout** | Hangs | ✅ Returns in 30s with message |
| **No session** | Returns error message | ✅ Returns helpful message (same) |

## 🚀 How to Test

### Test 1: Normal Case
```bash
curl -X POST http://localhost:3000/api/outlets/check-number \
  -H "Content-Type: application/json" \
  -d '{"whatsappNumber": "081260268381"}'

# Expected: Should get response within 2-5 seconds
# Response: { valid: true, exists: true, message: "Nomor WhatsApp aktif ✓" }
```

### Test 2: Slow Network Simulation
```javascript
// Add artificial delay in socket or network
// Should still complete in ~12 seconds instead of hanging
```

### Test 3: No Session
```bash
# Without any WhatsApp session connected
curl -X POST http://localhost:3000/api/outlets/check-number \
  -H "Content-Type: application/json" \
  -d '{"whatsappNumber": "081260268381"}'

# Expected: Should return within 2-3 seconds
# Response: { valid: true, exists: false, message: "Format valid. Tidak ada akun WhatsApp..." }
```

## 🔗 Related Documentation
- [Baileys Library Issues](https://github.com/WhiskeySockets/Baileys/issues)
- [WhatsApp Socket Connection Guide](../WHATSAPP_CONNECTION_GUIDE.md)
- [Outlet Status Monitoring](../OUTLET_STATUS_MONITORING.md)

## 📝 Notes

1. **Timeout Values Chosen:**
   - Service layer: **12 seconds** (aggressive, user feedback fast)
   - API layer: **30 seconds** (accounts for network + service time)

2. **Graceful Degradation:**
   - If verification fails/timeout, user can still create outlet
   - Format is still validated, just not WhatsApp existence
   - User can retry verification after connecting WhatsApp

3. **Future Improvements:**
   - Implement exponential backoff retry on first timeout
   - Cache verification results (1 hour TTL)
   - Add metrics/monitoring for timeout frequency
   - Pre-warm socket connections for common outlet users

## 🐛 Debugging

Enable verbose logging:
```typescript
// In baileys.service.ts, change logger level to 'debug'
logger: {
  level: 'debug' as any,  // ← Change from 'error' to 'debug'
  ...
}
```

Check console logs:
```
[Baileys] Checking onWhatsApp for JID: 6281260268381@s.whatsapp.net
[Baileys] onWhatsApp check timed out for 081260268381, assuming number is OK
[API] Check number result for 081260268381: { valid: true, exists: false, ... }
```

---

**Last Updated:** October 25, 2025  
**Status:** ✅ Implemented and tested
