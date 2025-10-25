# 📋 Fitur Template Pesan WhatsApp

## Ringkasan

Fitur template pesan memungkinkan setiap outlet membuat, menyimpan, dan mengelola template pesan yang dapat digunakan kembali untuk blast WhatsApp. Ini meningkatkan efisiensi dan konsistensi komunikasi marketing.

## Fitur Utama

### 1. **Kelola Template** (`/templates`)
- ✅ Buat template baru dengan nama, kategori, dan deskripsi
- ✅ Edit template yang sudah ada
- ✅ Hapus template yang tidak dibutuhkan
- ✅ Cari template berdasarkan nama atau deskripsi
- ✅ Filter berdasarkan outlet dan kategori
- ✅ Lihat jumlah penggunaan template

### 2. **Gunakan Template** (di halaman `/blast`)
- ✅ Dropdown untuk memilih template
- ✅ Auto-fill pesan saat template dipilih
- ✅ Link ke halaman kelola template

### 3. **Salin Template**
- ✅ Tombol "Gunakan" untuk copy template ke clipboard
- ✅ Notifikasi saat template berhasil disalin

## Struktur Database

### Model: `MessageTemplate`
```prisma
model MessageTemplate {
  id          String    // Template ID (cuid)
  outletId    String    // Outlet yang memiliki template
  name        String    // Nama template (e.g., "Promo Ramadan")
  content     String    // Konten pesan (max 4000 chars)
  category    String?   // Kategori (e.g., "Promo", "Reminder")
  description String?   // Deskripsi singkat
  variables   Json?     // Variabel untuk dynamic content
  isActive    Boolean   // Status template
  usageCount  Int       // Berapa kali digunakan
  createdAt   DateTime  // Waktu dibuat
  updatedAt   DateTime  // Waktu diupdate
}
```

## API Endpoints

### 1. **GET /api/templates** - Fetch Templates
Query Parameters:
- `outletId` (optional) - Filter by outlet
- `category` (optional) - Filter by category

Response:
```json
{
  "templates": [
    {
      "id": "template_id",
      "name": "Promo Ramadan",
      "content": "Halo customer...",
      "category": "Promo",
      "description": "Template untuk promo Ramadan",
      "usageCount": 5,
      "outletId": "outlet_id"
    }
  ],
  "categories": ["Promo", "Reminder", "Notifikasi"]
}
```

### 2. **POST /api/templates** - Create Template
Request Body:
```json
{
  "outletId": "outlet_id",
  "name": "Promo Ramadan",
  "content": "Halo...",
  "category": "Promo",
  "description": "Template untuk promo",
  "variables": ["customer_name", "discount"]
}
```

### 3. **GET /api/templates/[id]** - Get Template Detail
Response: Template object

### 4. **PUT /api/templates/[id]** - Update Template
Request Body: Semua field template (partial update OK)

### 5. **DELETE /api/templates/[id]** - Delete Template
Response: Success message

## Fitur UI

### Halaman Template Manager (`/templates`)

#### Header Section
- Judul: "📋 Template Pesan WhatsApp"
- Tombol: "➕ Template Baru" untuk membuat template baru

#### Filter Section
- 🔍 Search bar untuk cari template
- 🏢 Dropdown untuk pilih outlet
- 📂 Dropdown untuk pilih kategori

#### Template Cards
Setiap template ditampilkan dalam card dengan:
- Nama template
- Badge kategori
- Preview konten (max 100px height dengan scroll)
- Usage count
- Tombol action:
  - 📋 **Gunakan** - Copy ke clipboard
  - ✏️ **Edit** - Edit template
  - 🗑️ **Hapus** - Hapus template

### Template Modal

#### Field
1. **Nama Template** (required)
   - Text input
   - Placeholder: "Contoh: Promo Ramadan"

2. **Kategori** (optional)
   - Text input
   - Placeholder: "Contoh: Promo, Reminder, Notifikasi"

3. **Deskripsi** (optional)
   - Text input
   - Placeholder: "Deskripsi singkat"

4. **Konten Pesan** (required)
   - Textarea (6 rows)
   - Character counter (0/4000)
   - Color feedback:
     - Red: > 4000 chars (disabled)
     - Yellow: 3800-4000 chars (warning)
     - Normal: < 3800 chars

#### Validation
- Nama wajib diisi
- Konten wajib diisi
- Konten max 4000 karakter

### Blast Page Integration

Di halaman `/blast`, bagian baru:

```
┌─────────────────────────────────┐
│ Gunakan Template Pesan          │
│ [Pilih Template...         ] [Kelola]
│ 💡 Pilih template untuk...      │
└─────────────────────────────────┘
```

Fitur:
- Dropdown list semua template
- Format: `[Kategori] Nama Template`
- Auto-fill pesan saat dipilih
- Link ke halaman kelola template

## Workflow

### 1. Membuat Template Baru
```
Halaman Templates
    ↓
Klik "➕ Template Baru"
    ↓
Template Modal terbuka
    ↓
Isi nama, kategori, deskripsi, konten
    ↓
Klik "✅ Simpan Template"
    ↓
Template tersimpan di database
    ↓
Notifikasi "✅ Template berhasil dibuat"
```

### 2. Menggunakan Template di Blast
```
Halaman Blast
    ↓
Pilih template dari dropdown
    ↓
Pesan auto-fill ke textarea
    ↓
Edit pesan jika perlu
    ↓
Kirim blast
```

### 3. Mengelola Template
```
Halaman Templates
    ↓
Cari/filter template
    ↓
Pilih action:
  - Gunakan (copy)
  - Edit (update)
  - Hapus (delete)
```

## Best Practices

### Naming Convention
- ✅ Gunakan nama deskriptif
- ✅ Gunakan kategori untuk organize
- ✅ Contoh: `[Promo] Diskon 20% Akhir Bulan`

### Content Guidelines
- ✅ Gunakan emoji untuk menarik
- ✅ Format dengan line breaks untuk readability
- ✅ Test sebelum menggunakan di blast
- ✅ Hindari info sensitif di template

### Organization
- ✅ Gunakan kategori konsisten
- ✅ Update template bila ada perubahan brand message
- ✅ Archive template lama via soft delete

## Technical Details

### Character Encoding
- UTF-8 support ✅
- Emoji support ✅
- Spesial characters support ✅
- Max length: 4000 karakter

### Performance
- Template fetch: Indexed by `outletId` dan `isActive`
- Search: Client-side filtering (semua template fetch once)
- Category: Fetched dari distinct values

### Security
- Outlet access control: USER hanya access outlet sendiri
- ADMIN/SUPERADMIN: Akses semua outlets
- Soft delete: Via `isActive` flag

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── templates/
│   │       ├── route.ts          # GET/POST endpoints
│   │       └── [id]/
│   │           └── route.ts      # GET/PUT/DELETE endpoints
│   ├── templates/
│   │   └── page.tsx              # Template manager UI
│   └── blast/
│       └── page.tsx              # Updated with template selector
│
├── components/
│   └── modals/
│       └── TemplateModal.tsx      # Template create/edit form
│
└── lib/
    └── prisma.ts                 # Prisma client

prisma/
└── schema.prisma                 # MessageTemplate model
```

## Testing Checklist

- [ ] Create template dengan berbagai kategori
- [ ] Search dan filter template
- [ ] Edit template yang sudah ada
- [ ] Delete template
- [ ] Copy template (gunakan)
- [ ] Gunakan template di blast page
- [ ] Auto-fill pesan saat template dipilih
- [ ] Validasi character limit
- [ ] Test role-based access (USER vs ADMIN)
- [ ] Verify outlet isolation

## Future Enhancements

- 🔄 Template versioning
- 📊 Analytics: template yang paling sering digunakan
- 🔤 Variable interpolation: `{customer_name}`, `{date}`
- 📱 Template dari blast history
- ⭐ Star/favorite templates
- 🔗 Share template antar outlet
- 📅 Schedule template blast

---

**Status**: ✅ Implemented  
**Version**: 1.0  
**Last Updated**: 2025-10-24
