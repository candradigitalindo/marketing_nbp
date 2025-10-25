#!/usr/bin/env node

/**
 * Pre-flight Check untuk Background Job System
 * Mengecek apakah semua komponen siap untuk blast
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

console.log(`\n${colors.bright}🔍 Pre-flight Check - Background Job System${colors.reset}\n`)
console.log('━'.repeat(60))

let allGood = true

// 1. Check Redis Connection
console.log(`\n${colors.cyan}1. Checking Redis...${colors.reset}`)
try {
  const { execSync } = require('child_process')
  const result = execSync('redis-cli ping', { encoding: 'utf-8' }).trim()
  
  if (result === 'PONG') {
    console.log(`   ${colors.green}✅ Redis is running${colors.reset}`)
  } else {
    console.log(`   ${colors.red}❌ Redis responded but unexpected result: ${result}${colors.reset}`)
    allGood = false
  }
} catch (error) {
  console.log(`   ${colors.red}❌ Redis is not running${colors.reset}`)
  console.log(`   ${colors.yellow}   Fix: brew services start redis${colors.reset}`)
  allGood = false
}

// 2. Check .env file
console.log(`\n${colors.cyan}2. Checking .env configuration...${colors.reset}`)
try {
  const fs = require('fs')
  const envContent = fs.readFileSync('.env', 'utf-8')
  
  const hasDatabase = envContent.includes('DATABASE_URL')
  const hasRedis = envContent.includes('REDIS_URL')
  const hasNextAuth = envContent.includes('NEXTAUTH_SECRET')
  
  if (hasDatabase) {
    console.log(`   ${colors.green}✅ DATABASE_URL configured${colors.reset}`)
  } else {
    console.log(`   ${colors.red}❌ DATABASE_URL missing${colors.reset}`)
    allGood = false
  }
  
  if (hasRedis) {
    console.log(`   ${colors.green}✅ REDIS_URL configured${colors.reset}`)
  } else {
    console.log(`   ${colors.yellow}⚠️  REDIS_URL missing (using default: redis://localhost:6379)${colors.reset}`)
  }
  
  if (hasNextAuth) {
    console.log(`   ${colors.green}✅ NEXTAUTH_SECRET configured${colors.reset}`)
  } else {
    console.log(`   ${colors.red}❌ NEXTAUTH_SECRET missing${colors.reset}`)
    allGood = false
  }
} catch (error) {
  console.log(`   ${colors.red}❌ .env file not found${colors.reset}`)
  allGood = false
}

// 3. Check required files
console.log(`\n${colors.cyan}3. Checking required files...${colors.reset}`)
const requiredFiles = [
  'src/lib/redis.ts',
  'src/lib/queue.ts',
  'src/workers/blast.worker.ts',
  'src/workers/index.ts',
  'src/instrumentation.ts',
  'src/app/api/blast/route.ts',
  'src/app/api/blast/[id]/route.ts',
]

const fs = require('fs')
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ${colors.green}✅ ${file}${colors.reset}`)
  } else {
    console.log(`   ${colors.red}❌ ${file} not found${colors.reset}`)
    allGood = false
  }
})

// 4. Check next.config
console.log(`\n${colors.cyan}4. Checking Next.js configuration...${colors.reset}`)
try {
  const configContent = fs.readFileSync('next.config.ts', 'utf-8')
  
  if (configContent.includes('instrumentationHook')) {
    console.log(`   ${colors.green}✅ instrumentationHook enabled${colors.reset}`)
  } else {
    console.log(`   ${colors.red}❌ instrumentationHook not enabled in next.config.ts${colors.reset}`)
    console.log(`   ${colors.yellow}   Add: experimental: { instrumentationHook: true }${colors.reset}`)
    allGood = false
  }
} catch (error) {
  console.log(`   ${colors.yellow}⚠️  Could not read next.config.ts${colors.reset}`)
}

// 5. Check database migration
console.log(`\n${colors.cyan}5. Checking database migration...${colors.reset}`)
try {
  const { execSync } = require('child_process')
  const migrationDirs = fs.readdirSync('prisma/migrations')
  
  const hasBlastBackgroundJob = migrationDirs.some(dir => 
    dir.includes('add_blast_background_job')
  )
  
  if (hasBlastBackgroundJob) {
    console.log(`   ${colors.green}✅ Migration 'add_blast_background_job' found${colors.reset}`)
  } else {
    console.log(`   ${colors.yellow}⚠️  Migration 'add_blast_background_job' not found${colors.reset}`)
    console.log(`   ${colors.yellow}   Run: npx prisma migrate dev${colors.reset}`)
  }
} catch (error) {
  console.log(`   ${colors.yellow}⚠️  Could not check migrations${colors.reset}`)
}

// 6. Check if server is running
console.log(`\n${colors.cyan}6. Checking if Next.js server is running...${colors.reset}`)
try {
  const http = require('http')
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/blast/history',
    method: 'GET',
    timeout: 2000,
  }
  
  const req = http.request(options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 401) {
      console.log(`   ${colors.green}✅ Next.js server is running on http://localhost:3000${colors.reset}`)
    } else {
      console.log(`   ${colors.yellow}⚠️  Server responded with status ${res.statusCode}${colors.reset}`)
    }
  })
  
  req.on('error', (error) => {
    console.log(`   ${colors.red}❌ Next.js server is not running${colors.reset}`)
    console.log(`   ${colors.yellow}   Start server: npm run dev${colors.reset}`)
  })
  
  req.on('timeout', () => {
    console.log(`   ${colors.yellow}⚠️  Server response timeout${colors.reset}`)
    req.destroy()
  })
  
  req.end()
} catch (error) {
  console.log(`   ${colors.yellow}⚠️  Could not check server status${colors.reset}`)
}

// Summary
setTimeout(() => {
  console.log('\n' + '━'.repeat(60))
  console.log(`\n${colors.bright}Summary:${colors.reset}`)
  
  if (allGood) {
    console.log(`${colors.green}✅ All checks passed! System ready for blast.${colors.reset}`)
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`)
    console.log(`1. Ensure server is running: ${colors.bright}npm run dev${colors.reset}`)
    console.log(`2. Open browser: ${colors.bright}http://localhost:3000/blast${colors.reset}`)
    console.log(`3. Send a test blast!`)
  } else {
    console.log(`${colors.yellow}⚠️  Some issues need to be fixed before blast can work.${colors.reset}`)
    console.log(`${colors.yellow}   Review the errors above and fix them.${colors.reset}`)
  }
  
  console.log(`\n${colors.cyan}Quick Commands:${colors.reset}`)
  console.log(`  Check queue:  ${colors.bright}./check-queue.sh${colors.reset}`)
  console.log(`  Check blasts: ${colors.bright}node check-blast.js${colors.reset}`)
  console.log(`  View DB:      ${colors.bright}npx prisma studio${colors.reset}`)
  console.log('')
}, 100)
