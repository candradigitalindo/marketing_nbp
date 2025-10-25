# Fix: Blast dengan Outlet Terpilih Tidak Berjalan

## 🔴 Masalah
- ✅ Broadcast ke **Semua Outlets** bekerja dengan baik
- ❌ Broadcast ke **Outlet Terpilih** tidak berjalan

## 🔍 Root Cause Analysis

### Kemungkinan Penyebab:

1. **outletIds tidak dikirim ke API** 
   - Frontend mengirim `outletIds: undefined` ketika selectedOutlets kosong
   - API tidak menerima data outlet yang dipilih

2. **Data format tidak sesuai**
   - selectedOutlets berisi ID, tapi mungkin format berbeda
   - Array kosong vs null vs undefined handling

3. **Logic error di Backend**
   - outletIds tidak diproses dengan benar
   - Query database gagal filter by outlet

4. **Session/Auth issue**
   - User role tidak teridentifikasi dengan benar
   - outletId user tidak terbaca dari session

## 🔧 Debug Steps

### Step 1: Cek Frontend (Browser Console)
```javascript
// Buka DevTools > Console
// Terapkan di blast page

// Sebelum klik Send Blast, jalankan:
console.log('selectedOutlets:', document.querySelector('input[type=checkbox]'))

// Atau tambahkan ke kode:
console.log('📤 Sending:', {
  message: message,
  outletIds: selectedOutlets.length > 0 ? selectedOutlets : undefined,
  selectedOutletsLength: selectedOutlets.length
})
```

### Step 2: Cek Network Request
1. Buka DevTools > Network tab
2. Klik "Send Blast" dengan outlet terpilih
3. Lihat POST /api/blast request
4. Cek payload di tab "Payload" atau "Request body"
5. Verifikasi `outletIds` array ada dan tidak kosong

### Step 3: Cek Server Logs
```bash
# Terminal server akan menampilkan:
# 📤 Blast payload - outletIds: ['outlet-id-1', 'outlet-id-2']
# 🔍 getBlastTargets - outletIds: ['outlet-id-1', 'outlet-id-2']
# 🔍 getBlastTargets - found customers: 15
```

## 🛠️ Perbaikan Implementasi

### A. Fix Frontend - Pastikan outletIds dikirim

**File:** `/src/app/blast/page.tsx`

```typescript
const handleSendBlast = async () => {
  if (!message.trim()) {
    alert('Silakan masukkan pesan terlebih dahulu')
    return
  }

  // 🔍 DEBUG: Log apa yang dikirim
  console.log('DEBUG - selectedOutlets:', selectedOutlets)
  console.log('DEBUG - Will send outletIds:', 
    selectedOutlets.length > 0 ? selectedOutlets : 'undefined (all outlets)')

  setIsLoading(true)
  try {
    const payload = {
      message,
      outletIds: selectedOutlets.length > 0 ? selectedOutlets : undefined,
    }
    
    console.log('DEBUG - Sending payload:', payload)

    const response = await fetch('/api/blast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const result = await response.json()
      setBlastResult(result)
      alert('✅ Blast berhasil dikirim!')
    } else {
      const error = await response.json()
      alert(`Error: ${error.error}`)
    }
  } catch (error) {
    console.error('Error sending blast:', error)
    alert('Gagal mengirim blast')
  } finally {
    setIsLoading(false)
  }
}
```

### B. Fix Backend - Better Error Handling

**File:** `/src/app/api/blast/route.ts`

Tambahkan error handling yang lebih detail:

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    console.log('📥 Received body:', JSON.stringify(body, null, 2))
    
    const schema = z.object({
      message: z.string().min(1),
      outletIds: z.array(z.string()).optional(),
      customerIds: z.array(z.string()).optional(),
    })
    
    const { message, outletIds, customerIds } = schema.parse(body)

    console.log('✅ Parsed data:')
    console.log('  - User:', session.user.noHp || session.user.email)
    console.log('  - Role:', session.user.role)
    console.log('  - User Outlet ID:', session.user.outletId)
    console.log('  - Message length:', message.length)
    console.log('  - outletIds:', outletIds)
    console.log('  - customerIds:', customerIds)

    // Validate message
    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: 'Pesan terlalu panjang (maksimal 4000 karakter)' }, { status: 400 })
    }

    // Validasi outletIds
    if (outletIds && outletIds.length > 0) {
      console.log('🎯 Sending to specific outlets:', outletIds)
    } else {
      console.log('🎯 Sending to all outlets')
    }

    const result = await whatsappService.sendBlast(
      { message, outletIds, customerIds },
      session.user.role,
      session.user.outletId
    )

    console.log('📊 Blast result:', result)

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('❌ Error sending blast:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengirim blast. Silakan coba lagi.' }, { status: 500 })
  }
}
```

### C. Verifikasi di CustomerService

**File:** `/src/modules/customers/services/customer.service.ts`

```typescript
async getCustomersForBlast(userRole: string, userOutletId?: string | null, outletIds?: string[]) {
  console.log('👥 getCustomersForBlast called with:')
  console.log('  - userRole:', userRole)
  console.log('  - userOutletId:', userOutletId)
  console.log('  - outletIds:', outletIds)

  if (userRole === 'SUPERADMIN') {
    // SUPERADMIN can access all customers
    if (outletIds && outletIds.length > 0) {
      console.log('📌 SUPERADMIN: Filtering by outletIds')
      return await this.customerRepository.findByOutletIds(outletIds)
    }
    console.log('📌 SUPERADMIN: Getting all customers')
    return await this.customerRepository.findAll()
  }

  if (userRole === 'ADMIN') {
    // ADMIN can access all customers or filter by outlets
    if (outletIds && outletIds.length > 0) {
      console.log('📌 ADMIN: Filtering by outletIds')
      return await this.customerRepository.findByOutletIds(outletIds)
    }
    console.log('📌 ADMIN: Getting all customers')
    return await this.customerRepository.findAll()
  }

  if (userRole === 'USER' && userOutletId) {
    // USER can only access customers from their outlet
    console.log('📌 USER: Filtering by their outlet only')
    return await this.customerRepository.findAll({ outletId: userOutletId })
  }

  throw new Error('Access denied')
}
```

## ✅ Testing Checklist

### Test 1: Broadcast ke Semua Outlets
- [ ] Buka halaman Blast
- [ ] Tidak pilih outlet apapun
- [ ] Ketik pesan
- [ ] Klik "Send Blast"
- [ ] **Result:** Pesan terkirim ke semua outlet ✅

### Test 2: Broadcast ke Satu Outlet
- [ ] Buka halaman Blast
- [ ] Pilih 1 outlet
- [ ] Ketik pesan
- [ ] Klik "Send Blast"
- [ ] **Result:** Pesan terkirim hanya ke outlet terpilih
- [ ] Cek server logs: `outletIds: ['outlet-id']` ✅

### Test 3: Broadcast ke Multiple Outlets
- [ ] Buka halaman Blast
- [ ] Pilih 2-3 outlets
- [ ] Ketik pesan
- [ ] Klik "Send Blast"
- [ ] **Result:** Pesan terkirim ke semua outlet yang dipilih
- [ ] Cek server logs: `outletIds: ['id1', 'id2', 'id3']` ✅

### Test 4: Verifikasi API Payload
- [ ] Buka DevTools > Network tab
- [ ] Filter by "blast"
- [ ] Lihat POST /api/blast request
- [ ] Klik tab "Payload"
- [ ] Verifikasi structure:
  ```json
  {
    "message": "Test message...",
    "outletIds": ["outlet-id-1", "outlet-id-2"]
  }
  ```
- [ ] ✅ Correct format

## 🎯 Common Issues & Solutions

### Issue: outletIds selalu undefined
**Solution:** 
- Cek checkbox logic di frontend
- Pastikan `selectedOutlets` state ter-update saat checkbox diklik
- Log `selectedOutlets` sebelum pengiriman

### Issue: outletIds dikirim tapi pesan tidak terkirim
**Solution:**
- Cek apakah outlet memiliki session WhatsApp yang aktif
- Verifikasi permission user terhadap outlet tersebut
- Cek apakah customers ada di outlet yang dipilih

### Issue: Batch send lambat
**Solution:**
- WhatsApp memiliki rate limit (~1 pesan per 800ms)
- Ini sudah implemented di `whatsapp.repository.ts`
- Expected time: 800ms × jumlah customer

## 📊 Expected Flow Diagram

```
┌─────────────────────────────────────────┐
│  User Select Outlets & Send Blast       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Frontend: handleSendBlast()            │
│  - Validate message                     │
│  - Create payload with selectedOutlets  │
│  - POST to /api/blast                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  API: POST /api/blast                   │
│  - Check auth                           │
│  - Parse body & validate                │
│  - LOG: outletIds received              │
│  - Call whatsappService.sendBlast()     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Service: sendBlast()                   │
│  - getBlastTargets(outletIds)           │
│  - LOG: outletIds passed                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Service: getCustomersForBlast()        │
│  - Check role + outletIds               │
│  - Call customerRepository.findByOutletIds()
│  - LOG: customers found                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Repository: sendBulkMessages()         │
│  - Loop through targets                 │
│  - Send each message via Baileys        │
│  - Handle errors                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  ✅ Result sent to Frontend              │
│  - sentCount                            │
│  - failedCount                          │
│  - Message details                      │
└─────────────────────────────────────────┘
```

## 🚀 Quick Fix Checklist

- [ ] Tambahkan console.log di frontend handleSendBlast()
- [ ] Cek Network tab untuk payload
- [ ] Tambahkan logging di API route
- [ ] Verifikasi outletIds dipass ke service
- [ ] Cek customerRepository.findByOutletIds() method
- [ ] Test dengan single outlet selection
- [ ] Test dengan multiple outlet selection
- [ ] Verifikasi Baileys session aktif untuk setiap outlet
- [ ] Check server logs untuk error messages

## 📝 Logs to Watch

```
✅ SUCCESS Pattern:
📤 Blast payload - outletIds: ['id1', 'id2']
🔍 getBlastTargets - outletIds: ['id1', 'id2']
🔍 getBlastTargets - found customers: 25
✅ Parsed data: Role: SUPERADMIN
📌 SUPERADMIN: Filtering by outletIds

❌ FAILURE Pattern:
📤 Blast payload - outletIds: undefined
🔍 getBlastTargets - outletIds: undefined
🔍 getBlastTargets - found customers: 0 (wrong!)
📌 SUPERADMIN: Getting all customers (fallback to all)
```

