// Health Check Script for Production
// Run: node health-check.js

const https = require('https');
const http = require('http');

const config = {
  appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || '',
};

console.log('🏥 Health Check - Marketing NBP');
console.log('================================\n');

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Check Web Application
async function checkWebApp() {
  return new Promise((resolve) => {
    const client = config.appUrl.startsWith('https') ? https : http;
    
    client.get(config.appUrl, (res) => {
      if (res.statusCode === 200 || res.statusCode === 307) {
        console.log(`${colors.green}✅ Web Application: Running (${res.statusCode})${colors.reset}`);
        results.passed++;
        resolve(true);
      } else {
        console.log(`${colors.yellow}⚠️  Web Application: Unexpected status (${res.statusCode})${colors.reset}`);
        results.warnings++;
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`${colors.red}❌ Web Application: Not accessible${colors.reset}`);
      console.log(`   Error: ${err.message}`);
      results.failed++;
      resolve(false);
    });
  });
}

// Check Redis
async function checkRedis() {
  try {
    const Redis = require('ioredis');
    const redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    await redis.connect();
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      console.log(`${colors.green}✅ Redis: Connected${colors.reset}`);
      results.passed++;
      await redis.quit();
      return true;
    }
  } catch (err) {
    console.log(`${colors.red}❌ Redis: Connection failed${colors.reset}`);
    console.log(`   Error: ${err.message}`);
    results.failed++;
    return false;
  }
}

// Check Database
async function checkDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    
    // Test query
    const userCount = await prisma.user.count();
    
    console.log(`${colors.green}✅ Database: Connected (${userCount} users)${colors.reset}`);
    results.passed++;
    
    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.log(`${colors.red}❌ Database: Connection failed${colors.reset}`);
    console.log(`   Error: ${err.message}`);
    results.failed++;
    return false;
  }
}

// Check Environment Variables
function checkEnvironment() {
  console.log('\n📋 Environment Check');
  console.log('--------------------');
  
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'REDIS_URL'];
  let allPresent = true;
  
  required.forEach(key => {
    if (process.env[key]) {
      console.log(`${colors.green}✅ ${key}: Set${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${key}: Missing${colors.reset}`);
      allPresent = false;
    }
  });
  
  if (allPresent) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  return allPresent;
}

// Check PM2 Processes
async function checkPM2() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    exec('pm2 jlist', (error, stdout) => {
      if (error) {
        console.log(`${colors.yellow}⚠️  PM2: Not available${colors.reset}`);
        results.warnings++;
        resolve(false);
        return;
      }
      
      try {
        const processes = JSON.parse(stdout);
        const web = processes.find(p => p.name === 'marketing-nbp-web');
        const worker = processes.find(p => p.name === 'marketing-nbp-worker');
        
        if (web && web.pm2_env.status === 'online') {
          console.log(`${colors.green}✅ PM2 Web: Running (PID: ${web.pid})${colors.reset}`);
          results.passed++;
        } else {
          console.log(`${colors.red}❌ PM2 Web: Not running${colors.reset}`);
          results.failed++;
        }
        
        if (worker && worker.pm2_env.status === 'online') {
          console.log(`${colors.green}✅ PM2 Worker: Running (PID: ${worker.pid})${colors.reset}`);
          results.passed++;
        } else {
          console.log(`${colors.red}❌ PM2 Worker: Not running${colors.reset}`);
          results.failed++;
        }
        
        resolve(true);
      } catch (err) {
        console.log(`${colors.yellow}⚠️  PM2: Parse error${colors.reset}`);
        results.warnings++;
        resolve(false);
      }
    });
  });
}

// Run all checks
async function runHealthCheck() {
  console.log('🔍 Service Checks');
  console.log('----------------');
  
  await checkWebApp();
  await checkRedis();
  await checkDatabase();
  
  checkEnvironment();
  
  console.log('\n🔧 Process Checks');
  console.log('-----------------');
  await checkPM2();
  
  // Summary
  console.log('\n📊 Summary');
  console.log('----------');
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  
  console.log('\n================================\n');
  
  if (results.failed > 0) {
    console.log(`${colors.red}❌ Health Check FAILED${colors.reset}`);
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log(`${colors.yellow}⚠️  Health Check PASSED with warnings${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.green}✅ Health Check PASSED${colors.reset}`);
    process.exit(0);
  }
}

// Run
runHealthCheck().catch(err => {
  console.error('Health check error:', err);
  process.exit(1);
});
