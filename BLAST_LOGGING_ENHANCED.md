# ✅ WhatsApp Broadcast (Blast) - Enhanced Logging

## 📋 Changes Made

To help diagnose why WhatsApp broadcast tidak mau mengirim, saya telah menambahkan **comprehensive logging** di seluruh blast flow.

## 🔧 Files Modified (5 files)

### 1. `/src/modules/wa/services/baileys.service.ts`
**Lines:** 483-507 (sendMessage method)

**Added:**
- Pre-send validation (socket exists, authenticated)
- Detailed logging at each step
- Phone number conversion logging
- Actual send logging
- Error context logging

**Before:**
```typescript
// ❌ Minimal, hard to debug
async sendMessage(outletId: string, toPhone: string, text: string) {
  await this.ensureSession(outletId)
  const sock = this.sockets.get(outletId)
  if (!sock) throw new Error('WhatsApp not connected')
  const jid = toJid(toPhone)
  await sock.sendMessage(jid, { text } as AnyMessageContent)
}
```

**After:**
```typescript
// ✅ Comprehensive, easy to debug
async sendMessage(outletId: string, toPhone: string, text: string) {
  console.log(`[Blast] Starting sendMessage...`)
  // ... (15+ console logs at each step)
  console.log(`[Blast] Message sent successfully...`)
}
```

### 2. `/src/modules/wa/repositories/whatsapp.repository.ts`
**Lines:** sendBulkMessages method

**Added:**
- Initial status logging (targets, message preview)
- Per-customer progress logging
- Success/failure indicators (✅/❌)
- Completion summary
- Rate limiting logs (800ms delays)

**Logging:**
```
[BlastRepository] Starting bulk message send to 5 targets
[BlastRepository] [1/5] Sending to John (08123456789)...
[BlastRepository] ✅ Success: John (08123456789)
[BlastRepository] [2/5] Sending to Jane (08123456790)...
[BlastRepository] ✅ Success: Jane (08123456790)
[BlastRepository] Bulk send completed: 5 success, 0 failed
```

### 3. `/src/modules/wa/services/whatsapp.service.ts`
**Lines:** sendBlast method

**Added:**
- Request details logging
- Customer count by outlet
- Preparation status
- Final completion summary

**Logging:**
```
[BlastService] Starting blast from user role: SUPERADMIN
[BlastService] Found 5 target customers
[BlastService] Customers grouped into 1 outlets:
  - Outlet Central: 5 customers
[BlastService] Starting to send 5 messages
[BlastService] Blast completed - Sent: 5, Failed: 0
```

### 4. `/src/modules/customers/services/customer.service.ts`
**Lines:** getCustomersForBlast method

**Added:**
- Role-based access logging
- Customer fetch logging
- Error logging on access denied

### 5. `/src/app/api/blast/route.ts`
**Lines:** POST handler

**Added:**
- User/role logging
- Payload details logging
- Validation error logging
- Error details in response

## 📈 Log Output Example

### Successful Blast
```
[Blast API] Blast request from user: admin@example.com (SUPERADMIN)
[Blast API] Payload - message length: 150, outletIds: 1, customerIds: 0
[Blast API] Calling whatsappService.sendBlast...
[BlastService] Starting blast from user role: SUPERADMIN
[BlastService] Found 5 target customers
[BlastService] Customers grouped into 1 outlets:
  - Outlet Central: 5 customers
[BlastService] Starting to send 5 messages
[BlastRepository] Starting bulk message send to 5 targets
[BlastRepository] [1/5] Sending to John (08123456789)
[Blast] Starting sendMessage for outlet outlet-1, to 08123456789
[Blast] Socket verified for outlet outlet-1
[Blast] Message sent successfully
[BlastRepository] ✅ Success: John
[BlastRepository] [2/5] Sending to Jane (08123456790)
...
[BlastRepository] Bulk send completed: 5 success, 0 failed out of 5 total
[Blast API] sendBlast completed - success: true, sent: 5, failed: 0
```

### Failed Blast (No Customers)
```
[BlastService] Found 0 target customers
[BlastService] No customers found for blast
[Blast API] sendBlast completed - success: false, sent: 0, failed: 0
```

### Failed Blast (Socket Not Connected)
```
[BlastRepository] [1/5] Sending to John (08123456789)
[Blast] ERROR in sendMessage: Socket not found for outlet outlet-1
[BlastRepository] ❌ Failed: John (08123456789) - Socket not found
[BlastRepository] Bulk send completed: 0 success, 5 failed out of 5 total
```

## 🎯 How to Use for Debugging

### 1. Check If Messages Are Being Sent
```bash
# Terminal
tail -f app.log | grep "\[BlastRepository\] ✅"
# Should see success logs
```

### 2. Check For Failures
```bash
# Terminal
tail -f app.log | grep "\[BlastRepository\] ❌"
# Will show failures with reason
```

### 3. Check Full Flow
```bash
# Terminal
tail -f app.log | grep "\[Blast"
# Shows all blast-related logs in order
```

### 4. Monitor From Start to End
```bash
# Browser
1. Open DevTools → Network tab
2. Go to http://localhost:3000/blast
3. Send blast
4. Check Network tab for POST /api/blast
5. Look at response for results

# Terminal
# Watch logs appear as blast sends
```

## ✨ Benefits

| Before | After |
|--------|-------|
| No logs for blast ❌ | Comprehensive logs ✅ |
| Hard to debug failures ❌ | Clear failure reasons ✅ |
| Unknown progress ❌ | See each message sent ✅ |
| Can't trace errors ❌ | Full error context ✅ |

## 🔍 What Logs Tell You

| Log Message | Means |
|-------------|-------|
| `Found 0 target customers` | No customers to send to |
| `Socket verified` | WhatsApp is connected |
| `Socket not found` | WhatsApp disconnected |
| `not authenticated` | Socket connected but not logged in |
| `✅ Success` | Message sent to this customer |
| `❌ Failed` | Message failed, see reason |
| `Conversion error` | Invalid phone number format |

## 🚀 Next Steps to Diagnose

1. **Open Terminal Where App Running**
2. **Go to http://localhost:3000/blast**
3. **Enter message and send blast**
4. **Look at terminal for logs:**
   - Do you see `[BlastService] Found X customers`?
   - Do you see `[Blast] Message sent successfully`?
   - Do you see `✅ Success` or `❌ Failed`?
5. **Share the log output**

## 📝 Common Patterns

### Pattern: No Customers Found
```
[BlastService] Found 0 target customers
→ Solution: Add customers in Customers page
```

### Pattern: Socket Not Connected
```
[Blast] ERROR: Socket not found for outlet
→ Solution: Reconnect WhatsApp in Outlets page
```

### Pattern: All Successful
```
[BlastRepository] ✅ Success (repeated 5 times)
[BlastRepository] Bulk send completed: 5 success, 0 failed
→ Everything working!
```

---

**Status:** ✅ Logging Enhanced  
**Date:** October 25, 2025  
**Version:** 2.2.0
