# 📱 Marketing NBP - WhatsApp Blast System

Sistem Marketing WhatsApp dengan fitur Broadcast otomatis menggunakan Next.js 14, Prisma, PostgreSQL, dan Baileys WhatsApp API.

## ✨ Fitur Utama

- 🔐 **Multi-user Authentication** (SuperAdmin, Admin, User)
- 📊 **Dashboard Analytics** dengan statistik real-time
- 🏪 **Outlet Management** dengan WhatsApp Integration
- 👥 **Customer Management** per outlet
- 📤 **WhatsApp Blast** dengan background job queue
- 📷 **Media Support** (Gambar, Dokumen, PDF) dengan caption
- ⚡ **Background Processing** menggunakan BullMQ + Redis
- 🛡️ **Anti-spam Protection** dengan randomized delays
- 📝 **Message Templates** untuk blast cepat
- 📈 **Blast Reports** dan tracking status

---

## 📋 Daftar Isi

- [Kebutuhan Sistem](#-kebutuhan-sistem)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Cara Menjalankan](#-cara-menjalankan)
- [Cara Menggunakan](#-cara-menggunakan)
- [Background Job System](#-background-job-system)
- [Monitoring](#-monitoring)
- [Troubleshooting](#-troubleshooting)
- [Struktur Project](#-struktur-project)

---

## 🔧 Kebutuhan Sistem

### Software yang Dibutuhkan:

1. **Node.js** v18 atau lebih baru
   ```bash
   node --version  # Check version
   ```

2. **PostgreSQL** v14 atau lebih baru
   ```bash
   psql --version  # Check version
   ```

3. **Redis** v6 atau lebih baru (untuk background jobs)
   ```bash
   redis-cli --version  # Check version
   ```

4. **npm** atau **yarn**
   ```bash
   npm --version
   ```

---

## 📦 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd marketing_nbp
```

### 2. Install Dependencies

```bash
npm install
```

Package utama yang terinstall:
- `next` - Next.js framework
- `@prisma/client` - Database ORM
- `@whiskeysockets/baileys` - WhatsApp API
- `bullmq` - Background job queue
- `ioredis` - Redis client
- `next-auth` - Authentication
- `bcryptjs` - Password hashing

### 3. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Download dari [PostgreSQL Official](https://www.postgresql.org/download/windows/)
- Install dan jalankan

### 4. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows:**
- Download dari [Redis Windows](https://github.com/microsoftarchive/redis/releases)
- Atau gunakan Docker:
  ```bash
  docker run -d -p 6379:6379 redis:alpine
  ```

### 5. Verifikasi Instalasi

```bash
# Check PostgreSQL
psql --version

# Check Redis
redis-cli ping
# Expected output: PONG

# Check Node.js
node --version
npm --version
```

---

## ⚙️ Konfigurasi

### 1. Buat Database PostgreSQL

```bash
# Login ke PostgreSQL
psql postgres

# Buat database
CREATE DATABASE marketing_nbp;

# Buat user (optional, jika belum ada)
CREATE USER root WITH PASSWORD '@Candra1234';

# Berikan akses
GRANT ALL PRIVILEGES ON DATABASE marketing_nbp TO root;

# Keluar
\q
```

### 2. Setup Environment Variables

Buat file `.env` di root project:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL="postgresql://root:@Candra1234@localhost:5432/marketing_nbp?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Redis (for Background Jobs)
REDIS_URL="redis://localhost:6379"
```

**⚠️ PENTING:** Ganti `NEXTAUTH_SECRET` dengan string random yang kuat:

```bash
# Generate random secret
openssl rand -base64 32
```

### 3. Database Migration

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 4. Seed Database (Optional)

Untuk data awal testing:

```bash
npm run seed
```

Ini akan membuat:
- 1 SuperAdmin user
- 3 Outlet dummy
- 10 Customer dummy

**Default Login:**
- Username: `superadmin`
- Password: `admin123`

---

## 🚀 Cara Menjalankan

### Development Mode (Recommended)

**Option 1: Auto-Start Semua (Paling Mudah)**

```bash
npm run dev:all
```

Ini akan otomatis start:
- ✅ Next.js dev server (http://localhost:3000)
- ✅ Background worker (untuk blast processing)

**Option 2: Manual (2 Terminal)**

Terminal 1 - Next.js Server:
```bash
npm run dev
```

Terminal 2 - Background Worker:
```bash
npm run worker
```

### Production Mode

```bash
# Build aplikasi
npm run build

# Start production server
npm start

# Di terminal terpisah, start worker
npm run worker
```

### Verifikasi

Buka browser: **http://localhost:3000**

Expected output di terminal:
```
✅ Blast worker started successfully
⏳ Worker is now listening for jobs...
Next.js ready on http://localhost:3000
```

---

## 📖 Cara Menggunakan

### 1. Login

1. Buka **http://localhost:3000**
2. Login dengan kredensial sesuai role:
   - **SuperAdmin:** Akses penuh
   - **Admin:** Kelola outlet dan customer
   - **User:** Hanya outlet sendiri

### 2. Setup Outlet & WhatsApp

#### a. Tambah Outlet (Admin/SuperAdmin)

1. Menu **Outlets** → **Tambah Outlet**
2. Isi form:
   - Nama Outlet
   - Nomor WhatsApp (format: 08xxx atau 628xxx)
   - Alamat
3. Klik **Simpan**

#### b. Koneksi WhatsApp

1. Di halaman **Blast** atau **Outlets**
2. Klik outlet yang ingin dikoneksi
3. **Scan QR Code** dengan WhatsApp
4. Tunggu status berubah jadi **Connected** ✅

**Tips:**
- Gunakan WhatsApp Business untuk hasil terbaik
- Pastikan nomor WhatsApp sudah terdaftar
- Jangan scan QR dari 2 device berbeda

### 3. Tambah Customer

1. Menu **Customers** → **Tambah Customer**
2. Isi form:
   - Nama Customer
   - Nomor WhatsApp (format Indonesia)
   - Outlet (pilih outlet terkait)
3. Klik **Simpan**

**Validasi Nomor:**
- ✅ 08123456789
- ✅ 628123456789
- ✅ +628123456789
- ❌ 8123456789 (harus ada 0 atau 62)

### 4. Kirim Blast

#### a. Blast Text Only

1. Menu **Blast**
2. Pilih **Outlet** (yang sudah connected)
3. Tulis **Pesan**
4. Klik **Kirim Blast**

#### b. Blast dengan Gambar + Caption

1. Tulis pesan
2. Klik icon **🖼️ Gambar**
3. Upload gambar (max 16MB)
4. Pilih mode: **"Kirim sebagai caption gambar"**
5. Klik **Kirim Blast**

#### c. Blast dengan Document + Caption

1. Tulis pesan
2. Klik icon **📎 File**
3. Upload PDF/DOC/Excel (max 16MB)
4. Pilih mode: **"Kirim sebagai caption file"**
5. Klik **Kirim Blast**

#### d. Blast Multiple Files

1. Tulis pesan
2. Upload beberapa file (gambar/dokumen)
3. Pilih mode: **"Kirim text dan file terpisah"**
4. Klik **Kirim Blast**

**Expected Behavior:**
```
1. Status: 📋 QUEUED (Blast dijadwalkan)
2. Status: ⚡ PROCESSING (Sedang kirim)
3. Progress bar muncul
4. Status: ✅ COMPLETED (Selesai)
5. Lihat statistik: Terkirim / Gagal
```

### 5. Gunakan Template

1. Menu **Blast**
2. Dropdown **"Gunakan Template"**
3. Pilih template
4. Edit jika perlu
5. Kirim

---

## ⚙️ Background Job System

### Arsitektur

```
User → API (/api/blast)
       ↓
   Create Blast (DB)
       ↓
   Add Job to Queue (Redis)
       ↓
   Return 202 Accepted
       ↓
   [Worker Process]
       ↓
   Send Messages (WhatsApp)
       ↓
   Update Status (COMPLETED)
```

### Kenapa Butuh Worker?

**❌ Tanpa Worker:**
- Blast stuck di QUEUED forever
- User harus tunggu sampai selesai
- Browser bisa timeout

**✅ Dengan Worker:**
- Blast berjalan di background
- User langsung dapat response
- Bisa tutup browser
- Progress tracking real-time

### Fitur Background Job

1. **Queue System** - Job dijadwalkan dan diproses berurutan
2. **Anti-spam Delays** - Randomized delay 1.5-5 detik per pesan
3. **Auto Retry** - Gagal otomatis retry 2x
4. **Progress Tracking** - Real-time progress bar
5. **Report Generation** - Laporan detail per customer

### Status Blast

| Status | Arti | Action |
|--------|------|--------|
| QUEUED | Dalam antrian | Tunggu worker proses |
| PROCESSING | Sedang kirim | Lihat progress bar |
| COMPLETED | Selesai | Lihat hasil statistik |
| FAILED | Gagal total | Cek error, kirim ulang |

---

## 📊 Monitoring

### 1. Cek Status Blast

**Via UI:**
- Status otomatis muncul di halaman Blast
- Progress bar real-time
- Statistik lengkap setelah selesai

**Via Command Line:**

```bash
# Cek semua blast
node check-blast.js

# Cek blast tertentu
node check-blast.js <blastId>

# Cek hanya yang aktif
node check-blast.js --active
```

### 2. Monitor Queue

```bash
# Cek Redis queue
./check-queue.sh
```

Output:
```
⏳ Waiting (QUEUED):     2
⚡ Active (PROCESSING):  1
✅ Completed:            15
❌ Failed:               0
```

### 3. View Database

```bash
npx prisma studio
```

Buka **http://localhost:5555** untuk melihat:
- Blast records
- BlastReport (detail per customer)
- Customer data
- Outlet data

### 4. Pre-flight Check

Sebelum mulai kerja, jalankan:

```bash
node preflight-check.js
```

Akan mengecek:
- ✅ Redis running
- ✅ Environment variables OK
- ✅ All required files exist
- ✅ Database migration applied
- ✅ Next.js server running

---

## 🔧 Troubleshooting

### 1. Worker Tidak Start

**Symptom:** Tidak ada log `[Workers]` di terminal

**Fix:**
```bash
# Stop semua process
pkill -f "next dev"
pkill -f "tsx worker"

# Clear cache
rm -rf .next

# Start ulang
npm run dev:all
```

### 2. Blast Stuck di QUEUED

**Symptom:** Status tidak berubah dari QUEUED

**Cause:** Worker tidak running

**Fix:**
```bash
# Check apakah worker jalan
ps aux | grep "tsx worker"

# Jika tidak ada, start worker
npm run worker
```

### 3. Redis Connection Failed

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Fix:**
```bash
# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Verify
redis-cli ping  # Should return: PONG
```

### 4. WhatsApp Not Connected

**Symptom:** "Socket not found" atau "Not authenticated"

**Fix:**
1. Refresh halaman Blast
2. Scan QR code lagi
3. Pastikan WhatsApp tidak login di device lain
4. Clear session:
   ```bash
   npm run wa:cleanup
   ```

### 5. Image Send Failed

**Symptom:** Error "Cannot read properties of undefined"

**Cause:** Buffer serialization issue (sudah di-fix)

**Fix:** Update code sudah include fix untuk convert Buffer ke base64

### 6. Database Migration Error

**Symptom:** `Unknown field` atau schema mismatch

**Fix:**
```bash
npx prisma generate
npx prisma migrate deploy

# Jika masih error, reset (⚠️ HAPUS DATA!)
npx prisma migrate reset --force
npm run seed
```

### 7. Port Already in Use

**Symptom:** `Port 3000 is in use`

**Fix:**
```bash
# Kill process di port 3000
lsof -ti:3000 | xargs kill -9

# Atau gunakan port lain
PORT=3001 npm run dev
```

---

## 📁 Struktur Project

```
marketing_nbp/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Data seed
│   └── migrations/            # Database migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   ├── blast/        # Blast API
│   │   │   ├── customers/    # Customer API
│   │   │   ├── outlets/      # Outlet API
│   │   │   └── users/        # User API
│   │   ├── blast/            # Blast page
│   │   ├── customers/        # Customer page
│   │   ├── dashboard/        # Dashboard
│   │   ├── login/            # Login page
│   │   └── outlets/          # Outlet page
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   │   ├── auth.ts           # NextAuth config
│   │   ├── prisma.ts         # Prisma client
│   │   ├── redis.ts          # Redis connection
│   │   └── queue.ts          # BullMQ queue
│   ├── modules/               # Business logic
│   │   ├── auth/             # Authentication
│   │   ├── customers/        # Customer service
│   │   ├── outlets/          # Outlet service
│   │   ├── users/            # User service
│   │   └── wa/               # WhatsApp service
│   │       ├── services/
│   │       │   └── baileys.service.ts  # Baileys integration
│   │       └── repositories/
│   │           └── whatsapp.repository.ts
│   └── workers/               # Background workers
│       ├── blast.worker.ts   # Blast job processor
│       └── index.ts          # Worker loader
├── worker.ts                  # Standalone worker
├── start-all.sh              # Start script
├── check-blast.js            # Blast status checker
├── check-queue.sh            # Queue monitor
├── preflight-check.js        # System checker
└── README.md                 # This file
```

---

## 🎯 Quick Commands Reference

| Action | Command |
|--------|---------|
| Start semua | `npm run dev:all` |
| Start server | `npm run dev` |
| Start worker | `npm run worker` |
| Build production | `npm run build` |
| Database migrate | `npx prisma migrate deploy` |
| Database seed | `npm run seed` |
| Database studio | `npx prisma studio` |
| Check blast | `node check-blast.js` |
| Check queue | `./check-queue.sh` |
| Pre-flight check | `node preflight-check.js` |
| Clear WhatsApp | `npm run wa:cleanup` |

---

## 🔒 Security Notes

1. **NEXTAUTH_SECRET** - Harus diganti di production
2. **Database Password** - Jangan commit ke Git
3. **WhatsApp Session** - Ada di folder `sessions/` (di .gitignore)
4. **Redis** - Sebaiknya pakai password di production

---

## 📝 Development Workflow

### Daily Start

```bash
# 1. Start Redis (jika belum)
brew services start redis

# 2. Start aplikasi
npm run dev:all

# 3. Open browser
open http://localhost:3000
```

### Making Changes

1. Edit code
2. Next.js hot reload otomatis
3. Worker perlu restart manual jika edit worker code:
   ```bash
   # Terminal worker: Ctrl+C
   npm run worker
   ```

### Testing

1. Kirim blast via UI
2. Monitor di terminal worker
3. Check status: `node check-blast.js`
4. View DB: `npx prisma studio`

---

## 🚀 Production Deployment

### 1. Environment Variables

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
REDIS_URL="rediss://user:pass@redis-host:6379"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<strong-random-secret>"
```

### 2. Build

```bash
npm run build
```

### 3. Start Services

```bash
# Start Next.js (production)
npm start

# Start Worker (di terminal/process terpisah)
npm run worker
```

### 4. Process Manager (Recommended)

Gunakan PM2 untuk manage processes:

```bash
npm install -g pm2

# Start Next.js
pm2 start npm --name "nextjs" -- start

# Start Worker
pm2 start npm --name "worker" -- run worker

# Save config
pm2 save

# Auto-start on boot
pm2 startup
```

---

## 📞 Support

Jika ada masalah:

1. **Check dokumentasi** di README ini
2. **Run pre-flight check:** `node preflight-check.js`
3. **View logs** di terminal server dan worker
4. **Check database** dengan Prisma Studio
5. **Monitor queue** dengan `./check-queue.sh`

---

## 📄 License

Private Project - All Rights Reserved

---

**Built with ❤️ using Next.js 14, Prisma, PostgreSQL, Redis, and Baileys**
