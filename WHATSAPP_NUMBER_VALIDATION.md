# WhatsApp Number Validation Feature

## Overview
Fitur ini menambahkan validasi nomor WhatsApp ketika menambahkan atau mengedit outlet untuk memastikan nomor yang dimasukkan adalah nomor WhatsApp aktif.

## Components

### 1. Baileys Service Enhancement
**File:** `src/modules/wa/services/baileys.service.ts`

**New Method:** `checkPhoneNumberValid(phoneNumber: string)`
- Memvalidasi apakah nomor WhatsApp tersebut aktif dan terdaftar di WhatsApp
- Menggunakan koneksi socket yang sudah terhubung untuk verifikasi
- Return object: `{ valid: boolean; exists: boolean; message: string }`

**Logic:**
1. Cek format nomor (minimal 10 digit)
2. Jika tidak ada socket terhubung, kembalikan status unknown
3. Jika ada socket terhubung, gunakan `onWhatsApp()` API dari Baileys untuk check
4. Return status valid dan message yang sesuai

**Example:**
```typescript
const result = await baileysService.checkPhoneNumberValid('+62812345678')
// Result:
// {
//   valid: true,
//   exists: true,
//   message: 'Nomor WhatsApp aktif'
// }
```

### 2. API Endpoint
**File:** `src/app/api/outlets/check-number/route.ts`

**Endpoint:** `POST /api/outlets/check-number`

**Request:**
```json
{
  "whatsappNumber": "+62 812 3456 7890"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "exists": true,
  "message": "Nomor WhatsApp aktif"
}
```

**Response (Not Active):**
```json
{
  "valid": false,
  "exists": false,
  "message": "Nomor WhatsApp tidak ditemukan atau tidak aktif"
}
```

**Authorization:** Hanya SUPERADMIN yang dapat mengakses endpoint ini

### 3. OutletModal UI Component
**File:** `src/components/modals/OutletModal.tsx`

**New Features:**
- Input field WhatsApp number dengan tombol "Check" (verifikasi icon)
- Real-time validation feedback dengan alert messages
- Disable form submit jika nomor belum diverifikasi
- Loading state saat sedang melakukan checking

**State Management:**
- `checkingNumber`: boolean - status sedang checking
- `numberCheckResult`: object - hasil checking dengan valid/exists/message
- `lastCheckedNumber`: string - nomor yang terakhir di-check (untuk mencegah duplicate request)

**UI Flow:**
1. User input nomor WhatsApp
2. User klik tombol "Check" (icon pesek hijau)
3. Loading spinner muncul selama checking
4. Jika valid & exists: tampil alert hijau "Nomor WhatsApp aktif" ✓
5. Jika tidak: tampil alert kuning dengan pesan error ⚠
6. Form submit enable/disable berdasarkan result

## Validation Rules

### Format Validation
- Nomor harus berisi minimal 10 digit
- Format: +62 812 3456 7890 atau 62812345678 atau 08123456789
- Special characters allowed: +, -, (, ), space

### WhatsApp Validation
- Check hanya bisa dilakukan jika ada minimal 1 session WhatsApp yang terhubung
- Jika tidak ada session: error "Tidak ada sesi terhubung untuk verifikasi"
- Jika connection error: error "Gagal memverifikasi nomor WhatsApp"
- Jika nomor tidak aktif: error "Nomor WhatsApp tidak ditemukan atau tidak aktif"

## User Workflow

### Adding New Outlet
1. Click "Tambah Outlet" button
2. Fill in: Nama Outlet, Alamat, Nomor WhatsApp
3. Click "Check" button next to WhatsApp number
4. Wait for verification (takes 1-2 seconds)
5. If valid: alert muncul "Nomor WhatsApp aktif"
6. If not valid: alert muncul dengan error message
7. Click "Tambah Outlet" to save (only enabled if number is verified)

### Editing Outlet
1. Click Edit button on outlet row
2. Modal opens with current data
3. If changing WhatsApp number: Must re-verify
4. Click "Check" to verify new number
5. Click "Simpan Perubahan" when verified

## Error Handling

### Scenarios
1. **No Session Connected**
   - Status: 200 (partial success)
   - Message: "Tidak ada sesi terhubung untuk verifikasi"
   - Action: User can still create outlet but without verification

2. **Invalid Format**
   - Status: 400
   - Message: "Format nomor WhatsApp tidak valid"
   - Action: Show inline error message

3. **Number Not Found**
   - Status: 400
   - Message: "Nomor WhatsApp tidak ditemukan atau tidak aktif"
   - Action: Show alert and prevent form submit

4. **Server Error**
   - Status: 500
   - Message: "Terjadi kesalahan saat memverifikasi nomor"
   - Action: Show error alert and allow fallback

## Logging

All operations are logged with prefix `[OutletModal]` or `[Baileys]`:

```
[Baileys] Checking if +628123456789 is valid WhatsApp number
[Baileys] Using connected session from cmh41qb7g0000i4pdjdenajy3 to check number
[Baileys] Phone number +628123456789 is valid and active on WhatsApp
[Baileys] Phone number +628123456789 is not valid on WhatsApp
[OutletModal] WhatsApp number check result: Nomor WhatsApp aktif
```

## Performance Considerations

- Verification happens on-demand (when user clicks Check button)
- Result is cached in `lastCheckedNumber` to prevent duplicate requests
- If user types same number multiple times, only first check is executed
- Timeout: If check takes longer than 5 seconds, show error message

## Future Enhancements

1. **Debouncing**: Auto-check after user stops typing (500ms delay)
2. **Batch Checking**: Check multiple numbers at once during bulk import
3. **Cache**: Store verification results temporarily (5 minutes)
4. **Offline Mode**: Allow submit without verification if no session connected
5. **Bulk Import**: CSV upload with number validation

## Testing

### Manual Testing Scenarios

1. **Valid Active Number**
   - Input: Your actual WhatsApp number
   - Expected: "Nomor WhatsApp aktif" ✓

2. **Invalid Number**
   - Input: +6699999999
   - Expected: "Nomor WhatsApp tidak ditemukan atau tidak aktif"

3. **Bad Format**
   - Input: abc123
   - Expected: "Format nomor WhatsApp tidak valid"

4. **Duplicate Check**
   - Click check twice with same number
   - Expected: Only one API call made (cached)

5. **No Session Connected**
   - Disconnect all WhatsApp sessions
   - Try to check number
   - Expected: "Tidak ada sesi terhubung untuk verifikasi"
