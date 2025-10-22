# Marketing NBP - WhatsApp Blast System

Sistem manajemen marketing dengan fitur WhatsApp blast untuk mengelola outlet, customer, dan kampanye pemasaran.

## 🚀 Fitur Utama

### Role & Akses (3 Level)
- **SUPERADMIN**: Akses penuh semua fitur, CRUD Outlet, CRUD semua customer, Blast WA ke semua customer
- **ADMIN**: Akses semua customer, Blast WA ke semua customer atau filter by outlet (tidak bisa CRUD outlet)
- **USER**: CRUD customer milik outlet sendiri, Blast WA hanya ke customer outlet sendiri (1 user per outlet)

### Modul Aplikasi
- **Dashboard**: Overview statistik dan quick actions
- **Outlet Management**: CRUD outlet dengan nomor WhatsApp (khusus SUPERADMIN)
- **Customer Management**: CRUD customer dengan filtering berdasarkan role
- **WhatsApp Blast**: Kirim pesan massal dengan QR scan integration
- **Authentication**: Login dengan NextAuth dan role-based access

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL dengan Prisma ORM
- **Authentication**: NextAuth.js dengan JWT
- **UI Library**: Bootstrap 5 dengan custom colors
- **Primary Keys**: ULID untuk semua tabel

## 📁 Struktur Folder

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API endpoints
│   │   ├── auth/          # NextAuth API
│   │   ├── outlets/       # Outlet CRUD APIs
│   │   ├── customers/     # Customer CRUD APIs
│   │   └── blast/         # WhatsApp blast APIs
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Login page
│   ├── outlets/          # Outlet management (SUPERADMIN only)
│   ├── customers/        # Customer management
│   ├── blast/            # WhatsApp blast interface
│   └── providers/        # React providers
├── modules/               # Business logic modules
│   ├── auth/             # Authentication logic
│   ├── outlets/          # Outlet business logic
│   │   ├── repositories/ # Data access layer
│   │   ├── services/     # Business logic layer
│   │   └── types/        # TypeScript interfaces
│   ├── customers/        # Customer business logic
│   └── wa/              # WhatsApp blast logic
├── lib/                  # Utilities & configurations
│   ├── prisma.ts        # Prisma client
│   ├── auth.ts          # NextAuth configuration
│   └── utils.ts         # Helper functions
└── middleware.ts         # Route protection middleware
```

## ⚙️ Installation & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd marketing_nbp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` dan sesuaikan konfigurasi:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketing_nbp?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# WhatsApp Integration (optional)
WA_API_URL="https://your-wa-service.com/api"
WA_API_KEY="your-wa-api-key"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with demo data
npx prisma db seed
```

### 5. Development Server
```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

## 🗄 Database Schema

### Model Utama

#### User
- `id`: String (CUID)
- `email`: String (unique)
- `name`: String
- `password`: String (hashed)
- `role`: Enum (SUPERADMIN, ADMIN, USER)
- `outletId`: String (optional, foreign key)

#### Outlet
- `id`: String (CUID)
- `namaOutlet`: String
- `alamat`: String
- `telepon`: String
- `whatsappNumber`: String (unique per outlet)

#### Customer
- `id`: String (CUID)
- `nama`: String
- `noWa`: String (formatted WhatsApp number)
- `email`: String (optional)
- `outletId`: String (foreign key)

## 🔐 Authentication & Authorization

### Login Credentials (Development)
```
SUPERADMIN: admin@example.com / password
ADMIN:      outlet@example.com / password  
USER:       user@example.com / password
```

### Role-based Access
- Middleware melindungi route berdasarkan role
- API endpoints memvalidasi akses sesuai role
- UI components menyesuaikan tampilan berdasarkan role

## 📱 WhatsApp Integration

### QR Scan Process
1. Setiap outlet memiliki 1 nomor WhatsApp
2. Nomor WhatsApp di-scan untuk integrasi
3. Status device (connected/disconnected/scanning)
4. Blast menggunakan nomor WhatsApp outlet sebagai pengirim

### Blast Rules
- **SUPERADMIN**: Semua customer dari semua outlet
- **ADMIN**: Semua customer atau filter by outlet
- **USER**: Hanya customer dari outlet sendiri

## 🎨 UI/UX Design

### Bootstrap 5 Custom Theme
- **Primary Color**: #38bdf8 (Sky Blue)
- **Secondary Color**: #facc15 (Yellow)
- Modern card design dengan shadow
- Responsive sidebar navigation
- Clean table layouts dengan hover effects

### Features
- Font Awesome icons
- Loading states & spinners
- Alert notifications
- Modal dialogs
- Responsive design (mobile-friendly)

## 🚀 Build & Deploy

### Production Build
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Development Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Database operations
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev      # Run migrations
npx prisma generate        # Generate client
npx prisma db push         # Push schema to database

# Linting
npm run lint
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Outlets (SUPERADMIN only)
- `GET /api/outlets` - List outlets
- `POST /api/outlets` - Create outlet
- `PUT /api/outlets/[id]` - Update outlet
- `DELETE /api/outlets/[id]` - Delete outlet

### Customers
- `GET /api/customers` - List customers (filtered by role)
- `POST /api/customers` - Create customer
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### WhatsApp Blast
- `POST /api/blast` - Send WhatsApp blast
- `POST /api/blast/preview` - Preview blast targets
- `GET /api/blast/qr/[whatsappNumber]` - Get QR code for WhatsApp

## 🛡 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based route protection
- API endpoint authorization
- Input validation with Zod
- CSRF protection (NextAuth)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Pastikan PostgreSQL running
   - Check DATABASE_URL di .env
   - Jalankan `npx prisma migrate dev`

2. **NextAuth Error**
   - Set NEXTAUTH_SECRET di .env
   - Pastikan NEXTAUTH_URL sesuai domain

3. **Bootstrap Styling Issues**
   - Clear browser cache
   - Check import order di layout.tsx

## 📝 Development Notes

### Repository Pattern
- Setiap module menggunakan repository pattern
- Service layer untuk business logic
- Repository layer untuk data access
- Clear separation of concerns

### Type Safety
- Strict TypeScript configuration
- Interface definitions untuk semua data
- Zod validation untuk API inputs
- Prisma-generated types

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

Developed by NBP Development Team for Marketing WhatsApp Blast System.

---

**Note**: Ini adalah aplikasi demo dengan stub WhatsApp integration. Untuk production, integrate dengan WhatsApp Business API atau service provider seperti Twilio, WooWA, dll.
