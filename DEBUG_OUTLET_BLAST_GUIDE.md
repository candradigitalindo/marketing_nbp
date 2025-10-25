# 🔧 Step-by-Step Debug Guide: Outlet Selection Blast Issue

## 🎯 Tujuan
Mengidentifikasi dan memperbaiki masalah broadcast dengan outlet terpilih.

## 📋 Pre-requisites
- Server running di `http://localhost:3000`
- Browser DevTools siap (F12)
- Akses admin/superadmin
- Minimal 1 outlet dengan WhatsApp terhubung
- Minimal 1 customer per outlet

---

## STEP 1: Verifikasi Frontend State ✅

### 1.1 Buka halaman Blast
```
http://localhost:3000/blast
```

### 1.2 Buka DevTools > Console (F12)
```
Shortcut: Cmd+Option+J (Mac) atau Ctrl+Shift+J (Windows)
```

### 1.3 Jalankan debug script di console
Paste ini di console:

```javascript
// Debug script untuk Blast page
(function() {
  console.log('=== BLAST PAGE DEBUG ===')
  
  // Jika React dev tools ter-install, coba akses state
  // Atau lihat nilai di form
  const checkboxes = document.querySelectorAll('input[type="checkbox"]')
  console.log('Checkboxes found:', checkboxes.length)
  
  checkboxes.forEach((cb, idx) => {
    console.log(`[${idx}] id=${cb.id}, checked=${cb.checked}, value=${cb.value}`)
  })
  
  const textarea = document.querySelector('textarea[id="message"]')
  if (textarea) {
    console.log('Message length:', textarea.value.length)
    console.log('Message:', textarea.value.substring(0, 50) + '...')
  }
})()
```

### 1.4 Expected Output:
```
=== BLAST PAGE DEBUG ===
Checkboxes found: 4
[0] id=outlet-all, checked=true, value=
[1] id=outlet-xxx1, checked=false, value=
[2] id=outlet-xxx2, checked=false, value=
[3] id=outlet-xxx3, checked=false, value=
Message length: 45
Message: Test broadcast message for selected...
```

---

## STEP 2: Pilih Outlet & Monitor State 📊

### 2.1 Di halaman Blast
- [ ] Lihat checkbox "Semua Outlets" → CHECKED
- [ ] Klik checkbox outlet pertama → UNCHECKED "Semua Outlets"
- [ ] Outlet pertama seharusnya CHECKED

### 2.2 Console debug yang diupdate
```javascript
// Run lagi di console setelah pilih outlet
const checkboxes = document.querySelectorAll('input[id^="outlet-"]:not(#outlet-all)')
const checked = Array.from(checkboxes).filter(cb => cb.checked)
console.log('Selected outlets:', checked.length)
console.log('Selected IDs:', checked.map(cb => cb.id))
```

### 2.3 Expected:
```
Selected outlets: 1
Selected IDs: ["outlet-12345abc"]
```

---

## STEP 3: Intercept Network Request 🌐

### 3.1 Buka DevTools > Network tab
- [ ] Tab Network terbuka
- [ ] Filter type = "Fetch/XHR"

### 3.2 Masukkan pesan di textarea
```
Test broadcast ke outlet terpilih
Ini adalah test message untuk debugging
```

### 3.3 Klik tombol "Kirim Blast"

### 3.4 Di Network tab
- [ ] Cari request ke `/api/blast`
- [ ] Klik request tersebut
- [ ] Buka tab "Payload" atau "Request body"

### 3.5 Verifikasi payload:
```json
{
  "message": "Test broadcast ke outlet terpilih\nIni adalah test message untuk debugging",
  "outletIds": ["outlet-12345abc"]
}
```

⚠️ **CRITICAL CHECK:**
- [ ] `outletIds` ADA dan berisi array ID outlet
- [ ] Bukan `undefined`
- [ ] Bukan array kosong

### 3.6 Jika payload SALAH
- [ ] Payload: `"outletIds": undefined` atau tidak ada?
  → **Problem:** Frontend tidak mengirim outletIds
  
- [ ] Payload: `"outletIds": []` (array kosong)?
  → **Problem:** Outlet selection tidak di-update di state

---

## STEP 4: Check Server Logs 📡

### 4.1 Lihat Terminal server
Cari output seperti:
```
📤 Blast payload - outletIds: ['outlet-12345abc']
🔍 getBlastTargets - outletIds: ['outlet-12345abc']
🔍 getBlastTargets - found customers: 5
```

### 4.2 Good sign (✅):
```
✅ outletIds diterima
✅ Customers ditemukan
✅ Pesan terkirim
```

### 4.3 Bad sign (❌):
```
❌ outletIds: undefined
❌ found customers: 0
❌ No targets to send
```

---

## STEP 5: Debug Browser Network Response 📥

### 5.1 Masih di Network tab
- [ ] Klik POST `/api/blast` request
- [ ] Buka tab "Response"

### 5.2 Lihat response body:
```json
{
  "success": true,
  "message": "Blast completed: 5 sent, 0 failed",
  "totalTargets": 5,
  "sentCount": 5,
  "failedCount": 0,
  "results": [...]
}
```

### 5.3 Interpretasi:
- **totalTargets: 5** → 5 customers ditargetkan (GOOD!)
- **sentCount: 5** → Semua terkirim (GOOD!)
- **sentCount: 0** → Pesan tidak terkirim (BAD!)

---

## STEP 6: Check Database Directly 💾

Jika perlu verifikasi lebih dalam:

```bash
# SSH ke server atau buka DB client

# Query outlets
SELECT id, "namaOutlet", "whatsappNumber" FROM outlets LIMIT 5;

# Query customers di specific outlet
SELECT id, nama, no_wa, outlet_id FROM customers 
WHERE outlet_id = 'outlet-xxx' LIMIT 5;
```

---

## 🐛 Troubleshooting Flowchart

```
START
  │
  ├─ Step 1: Checkboxes terdeteksi?
  │  ├─ YES → Step 2
  │  └─ NO → Problem: Outlet list tidak render
  │         Action: Check outlets fetch di useEffect
  │
  ├─ Step 2: Outlet selection berubah?
  │  ├─ YES → Step 3
  │  └─ NO → Problem: State tidak update
  │         Action: Check checkbox onChange handler
  │
  ├─ Step 3: outletIds ada di payload?
  │  ├─ YES → Step 4
  │  └─ NO → Problem: Frontend payload wrong
  │         Action: Trace handleSendBlast function
  │
  ├─ Step 4: Server menerima outletIds?
  │  ├─ YES → Step 5
  │  └─ NO → Problem: Network/API issue
  │         Action: Check server logs
  │
  ├─ Step 5: Customers ditemukan?
  │  ├─ YES → Step 6
  │  └─ NO → Problem: Database query
  │         Action: Check SQL query result
  │
  ├─ Step 6: Pesan terkirim?
  │  ├─ YES → ✅ SUCCESS!
  │  └─ NO → Problem: Baileys/WhatsApp issue
  │         Action: Check WhatsApp session
  │
  END
```

---

## 🔍 Common Issues & Quick Fixes

### Issue #1: outletIds undefined di Network tab

**Cause:** Frontend tidak mengirimkan data

**Fix:**
```typescript
// Sebelum:
body: JSON.stringify({
  message,
  outletIds: selectedOutlets.length > 0 ? selectedOutlets : undefined,
})

// Sesudah (eksplisit):
const payload = {
  message,
}
if (selectedOutlets.length > 0) {
  payload.outletIds = selectedOutlets
}
body: JSON.stringify(payload)
```

### Issue #2: totalTargets = 0

**Cause:** 
- Outlet tidak memiliki customers
- Database query gagal
- Permission issue

**Fix:**
- Verifikasi customers ada di database
- Check user role (USER hanya bisa akses own outlet)
- Add logging di `getCustomersForBlast`

### Issue #3: sentCount = 0

**Cause:**
- WhatsApp session not connected
- Baileys service error
- Rate limiting

**Fix:**
- Pastikan WhatsApp sudah connected (cek Connection status)
- Check Baileys logs di server
- Reduce batch size atau increase delay

---

## 📝 Debugging Checklist

### Frontend
- [ ] Console: Checkboxes terdeteksi
- [ ] Console: Selected outlets state update
- [ ] Network: outletIds ada di payload
- [ ] Network: Response status 200

### Backend
- [ ] Server logs: outletIds received
- [ ] Server logs: Customers found count > 0
- [ ] Server logs: Send started
- [ ] Server logs: Blast result logged

### Database
- [ ] Outlet exists dengan ID yang benar
- [ ] Customers ada untuk outlet tersebut
- [ ] WhatsApp session active untuk outlet

### WhatsApp
- [ ] Session status: CONNECTED
- [ ] Phone online di WhatsApp
- [ ] No rate limit error

---

## 🚀 Tes Skenario Lengkap

### Scenario A: Select 1 Outlet
1. [ ] Buka Blast page
2. [ ] Uncheck "Semua Outlets"
3. [ ] Check hanya "Outlet A"
4. [ ] Verify network payload: `outletIds: ['outlet-A-id']`
5. [ ] Verify response: `totalTargets > 0`
6. [ ] Check message received di WhatsApp

### Scenario B: Select Multiple Outlets
1. [ ] Check "Outlet A", "Outlet B", "Outlet C"
2. [ ] Verify network: `outletIds: ['id-A', 'id-B', 'id-C']`
3. [ ] Verify response: `totalTargets = sum(customers in A+B+C)`
4. [ ] Check message received di semua WhatsApp

### Scenario C: All Outlets (Semua Outlets)
1. [ ] Check "Semua Outlets"
2. [ ] Verify network: `outletIds: undefined` atau tidak ada field
3. [ ] Verify response: `totalTargets = sum(all customers)`
4. [ ] Check message received di semua outlet

---

## 📞 Still Having Issues?

### Collect Debug Info:
```bash
# 1. Browser console output (screenshot atau copy-paste)
# 2. Network request/response (screenshot)
# 3. Server logs (copy-paste output)
# 4. Database query result:

SELECT 
  o.id,
  o."namaOutlet",
  COUNT(c.id) as customer_count
FROM outlets o
LEFT JOIN customers c ON o.id = c.outlet_id
GROUP BY o.id
ORDER BY customer_count DESC;
```

### Then report dengan:
- [ ] Exact error message
- [ ] Expected vs actual result
- [ ] Steps to reproduce
- [ ] Debug info (di atas)

