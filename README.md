# 📱 Marketing NBP - WhatsApp Blast System

Sistem Marketing WhatsApp dengan fitur Broadcast otomatis menggunakan **Background Job Queue**.

## ✨ Fitur Utama

- 🔐 Multi-user Authentication (SuperAdmin, Admin, User)
- 📊 Dashboard Analytics real-time
- 🏪 Outlet Management dengan WhatsApp Integration
- 👥 Customer Management per outlet
- 📤 **WhatsApp Blast dengan Background Processing (BullMQ + Redis)**
- 📷 Media Support (Gambar, Dokumen, PDF) dengan caption
- ⚡ Anti-spam Protection dengan randomized delays
- 📝 Message Templates
- 📈 Blast Reports dan tracking status

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd marketing_nbp

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env sesuai konfigurasi (DATABASE_URL, REDIS_URL, dll)

# 4. Database setup
npx prisma generate
npx prisma migrate deploy
npm run seed

# 5. Start aplikasi (Next.js + Worker)
npm run dev:all
```

**Default Login:**
- Username: `superadmin`
- Password: `admin123`

## 📖 Dokumentasi Lengkap

**👉 Lihat [DOKUMENTASI.md](./DOKUMENTASI.md) untuk:**

- 📋 Kebutuhan sistem (Node.js, PostgreSQL, Redis)
- 📦 Instalasi lengkap step-by-step
- ⚙️ Konfigurasi environment
- � Cara menjalankan aplikasi
- 📖 Tutorial penggunaan
- ⚙️ Background job system (BullMQ)
- 📊 Monitoring tools
- 🔧 Troubleshooting
- 📁 Struktur project detail

## � Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL dengan Prisma ORM
- **Background Jobs:** BullMQ + Redis
- **WhatsApp:** Baileys (Multi-device API)
- **Authentication:** NextAuth.js
- **UI:** Bootstrap 5 + Custom Theme

## ⚡ Background Job System

Sistem blast menggunakan **BullMQ** untuk processing background:

```bash
# PENTING: Worker WAJIB running untuk blast bekerja!

# Option 1: Auto-start semua (Recommended)
npm run dev:all

# Option 2: Manual (2 terminal)
npm run dev      # Terminal 1
npm run worker   # Terminal 2
```

**Kenapa butuh worker?**
- ✅ Blast berjalan di background
- ✅ User tidak perlu tunggu
- ✅ Anti-spam delays otomatis
- ✅ Auto retry jika gagal
- ✅ Progress tracking real-time

## � Monitoring Tools

```bash
# Cek status blast
node check-blast.js

# Cek Redis queue
./check-queue.sh

# Pre-flight system check
node preflight-check.js

# View database
npx prisma studio
```

## 🔧 Troubleshooting Cepat

| Problem | Solution |
|---------|----------|
| Blast stuck di QUEUED | Start worker: `npm run worker` |
| Redis connection failed | Start Redis: `brew services start redis` |
| WhatsApp not connected | Scan QR code di halaman Blast |
| Port 3000 in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |

**Lihat [DOKUMENTASI.md](./DOKUMENTASI.md#-troubleshooting) untuk troubleshooting lengkap.**

## � Quick Commands

| Action | Command |
|--------|---------|
| Start semua | `npm run dev:all` |
| Start server only | `npm run dev` |
| Start worker only | `npm run worker` |
| Build production | `npm run build` |
| Database migrate | `npx prisma migrate deploy` |
| Database studio | `npx prisma studio` |

## 🔒 Security Notes

- ⚠️ Ganti `NEXTAUTH_SECRET` di production
- ⚠️ Jangan commit `.env` ke Git
- ⚠️ WhatsApp sessions ada di folder `sessions/` (di .gitignore)
- ⚠️ Gunakan Redis password di production

## � License

Private Project - All Rights Reserved

---

**📚 [BACA DOKUMENTASI LENGKAP](./DOKUMENTASI.md)** untuk tutorial instalasi dan cara menggunakan semua fitur.
