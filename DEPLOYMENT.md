# Production Deployment Guide

## 📋 Prerequisites

Sebelum deploy production, pastikan sudah install:

1. **Node.js** v18+
2. **PostgreSQL** v14+
3. **Redis** v6+
4. **PM2** (Process Manager) - akan auto-install oleh script

## 🚀 Deployment Methods

### Method 1: Automatic Deployment (Recommended)

Gunakan deployment script otomatis:

```bash
# 1. Buat file environment production
cp .env.production .env.production.local

# 2. Edit dengan nilai production yang sebenarnya
nano .env.production.local

# 3. Jalankan deployment script
chmod +x deploy.sh
./deploy.sh
```

Script akan otomatis:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Build aplikasi
- ✅ Start dengan PM2

### Method 2: Manual Deployment

```bash
# 1. Setup environment
cp .env.production .env.production.local
# Edit .env.production.local

# 2. Install dependencies
npm ci --only=production

# 3. Database setup
npx prisma generate
npx prisma migrate deploy

# 4. Build aplikasi
npm run build

# 5. Install PM2 (jika belum)
npm install -g pm2

# 6. Start services
pm2 start ecosystem.config.js --env production

# 7. Save PM2 config
pm2 save

# 8. Setup PM2 auto-start on boot
pm2 startup
```

### Method 3: Docker Deployment

```bash
# 1. Setup environment variables
cp .env.production .env.production.local
# Edit .env.production.local

# 2. Create .env file for docker-compose
cat > .env << EOF
DB_PASSWORD=your_strong_db_password
REDIS_PASSWORD=your_strong_redis_password
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com
EOF

# 3. Build and start containers
docker-compose up -d

# 4. Run database migrations
docker-compose exec web npx prisma migrate deploy

# 5. View logs
docker-compose logs -f
```

## ⚙️ Configuration

### Environment Variables (.env.production.local)

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/marketing_nbp?schema=public&sslmode=require"

# NextAuth
NEXTAUTH_SECRET="GENERATE_WITH: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"

# Redis
REDIS_URL="rediss://user:pass@redis-host:6379"

# Node Environment
NODE_ENV="production"
```

### Generate Secure NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## 🔧 PM2 Commands

```bash
# Start services
npm run start:prod

# Stop services
npm run stop:prod

# Restart services
npm run restart:prod

# View logs
npm run logs:prod

# Monitor resources
pm2 monit

# View process list
pm2 list

# Delete all processes
pm2 delete all
```

## 🐳 Docker Commands

```bash
# Build images
npm run docker:build

# Start containers
npm run docker:up

# Stop containers
npm run docker:down

# View logs
npm run docker:logs

# Restart specific service
docker-compose restart web
docker-compose restart worker
```

## 📊 Monitoring

### Check Application Status

```bash
# PM2 Dashboard
pm2 monit

# View logs
tail -f logs/web-out.log
tail -f logs/worker-out.log

# Check errors
tail -f logs/web-error.log
tail -f logs/worker-error.log
```

### Check Services

```bash
# Check web is running
curl http://localhost:3000

# Check database
psql $DATABASE_URL -c "SELECT version();"

# Check Redis
redis-cli -u $REDIS_URL ping

# Check queue status
./check-queue.sh

# Check blast status
node check-blast.js
```

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Generate strong NEXTAUTH_SECRET
- [ ] Enable PostgreSQL SSL (sslmode=require)
- [ ] Use Redis password
- [ ] Setup firewall rules
- [ ] Enable HTTPS/SSL
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

## 🔄 Update/Redeploy

```bash
# Pull latest code
git pull origin main

# Automatic redeploy
./deploy.sh

# Or manual:
npm ci --only=production
npx prisma migrate deploy
npm run build
pm2 restart all
```

## 🗄️ Database Backup

```bash
# Backup database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup-20250101.sql
```

## 🚨 Troubleshooting

### Services Won't Start

```bash
# Check logs
pm2 logs

# Check if ports are in use
lsof -i :3000  # Web
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Restart all
pm2 restart all
```

### Database Connection Error

```bash
# Test connection
psql $DATABASE_URL

# Run migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Redis Connection Error

```bash
# Test Redis
redis-cli -u $REDIS_URL ping

# Check Redis is running
ps aux | grep redis
```

### Worker Not Processing Jobs

```bash
# Check worker logs
pm2 logs marketing-nbp-worker

# Restart worker
pm2 restart marketing-nbp-worker

# Check queue
./check-queue.sh
```

## 🌐 Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📞 Support

Jika ada masalah deployment:

1. Check logs: `pm2 logs`
2. Run health check: `node preflight-check.js`
3. Verify environment: Check `.env.production.local`
4. Test connections: Database, Redis, Web

## 📄 Files Structure

```
marketing_nbp/
├── .env.production          # Template environment
├── .env.production.local    # Actual production values (gitignored)
├── ecosystem.config.js      # PM2 configuration
├── deploy.sh               # Deployment script
├── Dockerfile              # Docker image for web
├── Dockerfile.worker       # Docker image for worker
├── docker-compose.yml      # Docker orchestration
└── logs/                   # PM2 logs directory
```
