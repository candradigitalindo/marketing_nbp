# WhatsApp Broadcast Debugging Guide

## 🔴 Problem
WhatsApp broadcast (blast) tidak mau mengirim pesan ke customers.

## 🔍 Troubleshooting Checklist

### Step 1: Check WhatsApp Connection
```bash
# Terminal where app is running
curl -H "Authorization: Bearer [token]" \
  http://localhost:3000/api/outlets/status

# Check response:
# - Should see outlets with status: "CONNECTED"
# - If DISCONNECTED: Need to reconnect WhatsApp first
```

**Expected:**
```json
{
  "statuses": [
    {
      "outlet": {
        "name": "Outlet Central",
        "whatsappNumber": "081260268381"
      },
      "liveStatus": {
        "status": "CONNECTED"
      },
      "healthy": true
    }
  ]
}
```

### Step 2: Check Customer Data
```bash
# Verify customers exist
curl -H "Authorization: Bearer [token]" \
  http://localhost:3000/api/customers

# Should return customers with noWa (WhatsApp number)
# If empty: Add customers first in Customers page
```

### Step 3: Enable Blast Logging

Terminal logs akan menunjukkan flow:

```
[Blast API] Blast request from user: admin@example.com (SUPERADMIN)
[Blast API] Payload - message length: 150, outletIds: 1, customerIds: 0
[BlastService] Starting blast from user role: SUPERADMIN
[BlastService] Found 5 target customers
[BlastService] Customers grouped into 1 outlets:
  - Outlet Central: 5 customers
[BlastService] Starting to send 5 messages
[BlastRepository] Starting bulk message send to 5 targets
[BlastRepository] [1/5] Sending to John (08123456789) from outlet outlet-1
[Blast] Starting sendMessage for outlet outlet-1, to 08123456789
[Blast] ensureSession completed for outlet outlet-1
[Blast] Socket verified for outlet outlet-1, user: 6281260268381@s.whatsapp.net
[Blast] Sending message to 6281260268381@s.whatsapp.net
[Blast] Message sent successfully to 6281260268381@s.whatsapp.net from outlet outlet-1
[BlastRepository] ✅ Success: John (08123456789)
```

## 🆘 Common Issues

### Issue 1: "No customers found for blast"
**Cause:** Tidak ada customers di database  
**Solution:**
```bash
# Add customers in Customers page first
# Or check database:
SELECT COUNT(*) FROM "Customer";
```

### Issue 2: "WhatsApp not connected"
**Cause:** Socket untuk outlet tidak connected  
**Log:** `[Blast] ERROR in sendMessage for outlet outlet-1: Socket not found for outlet outlet-1`

**Solution:**
```bash
# Reconnect WhatsApp
1. Go to Outlets page
2. Find outlet
3. Disconnect and reconnect
4. Wait for status to show CONNECTED
5. Try blast again
```

### Issue 3: "Socket is not authenticated"
**Cause:** Socket ada tapi tidak authenticated (user.id kosong)  
**Log:** `[Blast] Socket for outlet outlet-1 is not authenticated. User ID: undefined`

**Solution:**
```bash
# Socket belum fully ready, wait dan try again
# Or restart app:
killall node
npm run dev
```

### Issue 4: "Conversion error" (Phone number format)
**Cause:** Nomor customer tidak valid  
**Log:** `[Blast] ERROR in sendMessage: Cannot convert 123 to JID`

**Solution:**
```bash
# Check customer phone numbers
# Should be Indonesian format:
# - 08xxxxxxxxx
# - 62xxxxxxxxx
# - +628xxxxxxxxx
```

### Issue 5: "Timeout sending message"
**Cause:** Network lambat atau WhatsApp server slow  
**Log:** `[Blast] ERROR in sendMessage: Timeout`

**Solution:**
```bash
# Try again (usually temporary)
# Check network connection
# Try smaller blast (fewer customers)
```

### Issue 6: "Access denied"
**Cause:** User tidak punya akses ke customers/outlets  
**Log:** `[CustomerService] Access denied for role: USER`

**Solution:**
```bash
# USER role dapat hanya akses customers dari outlet mereka
# Check: session.user.outletId ada
# For SUPERADMIN/ADMIN: Seharusnya OK
```

## 🔧 Debugging Commands

### See All Logs for Blast
```bash
# Terminal
tail -f app.log | grep "\[Blast"
```

### Monitor One Customer Send
```bash
# Check logs untuk customer tertentu
tail -f app.log | grep "08123456789"
```

### Test Send Single Message
```bash
# Curl to test one message
curl -X POST http://localhost:3000/api/blast \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test message",
    "outletIds": ["outlet-1"]
  }'
```

## 📊 Log Analysis

### Success Scenario
```
[Blast] Message sent successfully to 6281260268381@s.whatsapp.net
[BlastRepository] ✅ Success: ...
results: [{ success: true, message: 'sent' }]
```

### Failure Scenarios

**Socket Not Connected:**
```
[Blast] ERROR: Socket not found for outlet outlet-1
[BlastRepository] ❌ Failed: ... - Socket not found
results: [{ success: false, message: 'Socket not found' }]
```

**Invalid Phone:**
```
[Blast] ERROR: Cannot convert ... to JID
[BlastRepository] ❌ Failed: ... - Cannot convert
results: [{ success: false, message: 'Cannot convert' }]
```

**Message Send Failed:**
```
[Blast] ERROR: Message send failed for ...
[BlastRepository] ❌ Failed: ... - Message send failed
results: [{ success: false, message: 'Message send failed' }]
```

## 🎯 Step-by-Step Debugging

### 1. Verify WhatsApp Connected
```bash
# Check status API
curl http://localhost:3000/api/outlets/status

# Look for: "healthy": true
# If false: Reconnect WhatsApp in Outlets page
```

### 2. Verify Customers Exist
```bash
# Check customers API
curl http://localhost:3000/api/customers

# Look for: "total" > 0
# If 0: Add customers in Customers page
```

### 3. Send Test Blast
```bash
# Send to single outlet
curl -X POST http://localhost:3000/api/blast \
  -H "Content-Type: application/json" \
  -d '{"message":"Test"}'

# Check response for:
# - "success": true
# - "sentCount": > 0
```

### 4. Check Logs
```bash
# Look in terminal for:
[Blast] Message sent successfully
[BlastRepository] ✅ Success

# If errors, copy full log message
```

### 5. Test Individual Customer
```bash
# Add 1 test customer
# Run blast with just that customer
# Check phone number is valid format
```

## 🚀 Testing Before Deployment

### Quick Test
1. Go to `http://localhost:3000/blast`
2. Enter test message (50 chars)
3. Select 1 outlet
4. Click "Kirim Blast"
5. Should see results in 2-3 seconds

### Check Terminal
```
[Blast API] Blast request from user
[BlastService] Found X target customers
[BlastRepository] Starting bulk message send
[BlastRepository] [1/X] Sending to...
[Blast] Message sent successfully
[BlastRepository] ✅ Success
[BlastRepository] Bulk send completed: X success, 0 failed
```

### Verify Results
```json
{
  "success": true,
  "message": "Blast completed: 5 sent, 0 failed",
  "sentCount": 5,
  "failedCount": 0,
  "totalTargets": 5
}
```

## 📱 WhatsApp Limits

- **Message delay:** 800ms between each customer (rate limiting)
- **Message length:** Max 4000 characters
- **Daily limit:** ~100 messages per account (WhatsApp limit)
- **Connection:** 1 account per outlet

## 🔍 Advanced Debugging

### Enable Full Logging
```typescript
// In baileys.service.ts
logger: {
  level: 'debug' as any,  // Change from 'error' to 'debug'
  ...
}
```

### Check Socket State
```bash
# In browser console
fetch('/api/outlets/status')
  .then(r => r.json())
  .then(d => {
    d.statuses.forEach(s => {
      console.log(s.outlet.name, s.healthy ? '✅' : '❌')
    })
  })
```

## 📞 If Still Not Working

1. **Collect Debug Info:**
   - Full error message from terminal
   - Response from API call
   - Screenshot of blast page
   - Customer data (masked)

2. **Check These:**
   - WhatsApp still connected? (check outlet-status)
   - Customer phone numbers valid format?
   - Message not too long (< 4000 chars)?
   - Customers have noWa field?

3. **Try Restart:**
   ```bash
   killall node
   npm run dev
   ```

---

**Last Updated:** October 25, 2025  
**Version:** 2.2.0
