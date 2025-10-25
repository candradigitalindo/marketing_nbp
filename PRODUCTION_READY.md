# ✅ Production Ready Checklist

Project **Marketing NBP** telah dilengkapi dengan konfigurasi production lengkap!

## 📦 File Production yang Sudah Dibuat

### Configuration Files
- ✅ `.env.example` - Template environment variables
- ✅ `.env.production` - Production environment template
- ✅ `ecosystem.config.js` - PM2 process manager config
- ✅ `next.config.ts` - Production optimizations

### Deployment Files
- ✅ `deploy.sh` - Automated deployment script
- ✅ `Dockerfile` - Docker image untuk web app
- ✅ `Dockerfile.worker` - Docker image untuk background worker
- ✅ `docker-compose.yml` - Multi-container orchestration
- ✅ `.dockerignore` - Docker build optimization

### Infrastructure Files
- ✅ `nginx.conf` - Nginx reverse proxy config
- ✅ `health-check.js` - Production health monitoring

### Documentation
- ✅ `DEPLOYMENT.md` - Complete deployment guide
- ✅ `DOKUMENTASI.md` - Full user documentation
- ✅ `README.md` - Quick start guide

## 🚀 Quick Start Production

### Option 1: PM2 (Recommended)
```bash
./deploy.sh
```

### Option 2: Docker
```bash
npm run docker:up
```

### Option 3: Manual
```bash
npm run build
npm run start:prod
```

## 📋 Pre-Deployment Checklist

- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Environment variables configured (`.env.production.local`)
- [ ] NEXTAUTH_SECRET generated (`openssl rand -base64 32`)
- [ ] Database URL configured
- [ ] Redis URL configured
- [ ] Domain/URL configured
- [ ] SSL certificate ready (for HTTPS)

## 🔧 Production Scripts Available

```bash
# Deployment
npm run build              # Build for production
npm run start:prod         # Start with PM2
npm run stop:prod          # Stop PM2 processes
npm run restart:prod       # Restart PM2 processes
npm run logs:prod          # View PM2 logs

# Health Check
npm run health             # Run health check

# Database
npm run db:migrate         # Run migrations
npm run db:generate        # Generate Prisma client

# Docker
npm run docker:build       # Build images
npm run docker:up          # Start containers
npm run docker:down        # Stop containers
npm run docker:logs        # View logs
```

## 📊 Monitoring Commands

```bash
# Health check
node health-check.js

# Check blast status
node check-blast.js

# Check queue
./check-queue.sh

# System check
node preflight-check.js

# PM2 monitoring
pm2 monit
pm2 list
pm2 logs
```

## 🔐 Security Features

- ✅ HTTPS support (nginx.conf)
- ✅ Security headers configured
- ✅ Password hashing (bcryptjs)
- ✅ JWT authentication
- ✅ Environment variables isolation
- ✅ Redis password support
- ✅ PostgreSQL SSL support

## 📁 Production Structure

```
marketing_nbp/
├── Production Config
│   ├── .env.production
│   ├── ecosystem.config.js
│   ├── next.config.ts
│   └── nginx.conf
├── Deployment
│   ├── deploy.sh ⭐
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── docker-compose.yml
├── Monitoring
│   ├── health-check.js
│   ├── check-blast.js
│   ├── check-queue.sh
│   └── preflight-check.js
└── Documentation
    ├── DEPLOYMENT.md ⭐
    ├── DOKUMENTASI.md
    └── README.md
```

## 🎯 Deployment Methods

### 1. Automatic (Easiest)
```bash
chmod +x deploy.sh
./deploy.sh
```

### 2. Docker (Containerized)
```bash
cp .env.production .env.production.local
# Edit .env.production.local
npm run docker:up
```

### 3. Manual (Full Control)
```bash
npm ci --only=production
npx prisma generate
npx prisma migrate deploy
npm run build
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
```

## 🌐 Nginx Setup

1. Copy nginx.conf ke `/etc/nginx/sites-available/`
2. Update SSL paths
3. Update domain name
4. Enable site: `ln -s /etc/nginx/sites-available/marketing_nbp /etc/nginx/sites-enabled/`
5. Test: `nginx -t`
6. Reload: `systemctl reload nginx`

## �� Scaling Considerations

### PM2 Cluster Mode
Edit `ecosystem.config.js`:
```js
instances: 'max', // Use all CPU cores
exec_mode: 'cluster',
```

### Load Balancing
Use nginx upstream:
```nginx
upstream nextjs {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### Database Connection Pooling
Prisma already handles this automatically!

## 🔄 Update Workflow

```bash
# 1. Pull latest code
git pull origin main

# 2. Redeploy
./deploy.sh

# Or manual:
npm ci --only=production
npx prisma migrate deploy
npm run build
pm2 restart all
```

## 🚨 Emergency Commands

```bash
# Stop everything
pm2 stop all

# Restart everything
pm2 restart all

# Delete all PM2 processes
pm2 delete all

# Kill processes on port
lsof -ti:3000 | xargs kill -9

# Clear Redis
redis-cli FLUSHALL

# Database backup
pg_dump $DATABASE_URL > backup.sql
```

## 📞 Support & Help

- **Documentation**: See `DEPLOYMENT.md`
- **User Guide**: See `DOKUMENTASI.md`
- **Health Check**: `npm run health`
- **Logs**: `pm2 logs` or `docker-compose logs -f`

---

**🎉 Your project is production-ready!**

For detailed deployment instructions, see: **[DEPLOYMENT.md](./DEPLOYMENT.md)**
