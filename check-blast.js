#!/usr/bin/env node

/**
 * Quick Blast Status Checker
 * 
 * Usage:
 *   node check-blast.js                    # Show all recent blasts
 *   node check-blast.js <blastId>          # Check specific blast
 *   node check-blast.js --active           # Show only active blasts
 */

const API_BASE = 'http://localhost:3000/api/blast'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function formatStatus(status) {
  const icons = {
    QUEUED: '📋',
    PROCESSING: '⚡',
    COMPLETED: '✅',
    FAILED: '❌',
    CANCELLED: '🚫',
  }
  
  const statusColors = {
    QUEUED: colors.yellow,
    PROCESSING: colors.cyan,
    COMPLETED: colors.green,
    FAILED: colors.red,
    CANCELLED: colors.red,
  }
  
  const icon = icons[status] || '❓'
  const color = statusColors[status] || colors.reset
  
  return `${icon} ${color}${status}${colors.reset}`
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A'
  
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function checkSpecificBlast(blastId) {
  console.log(`${colors.bright}🔍 Checking Blast: ${blastId}${colors.reset}\n`)
  
  try {
    const response = await fetch(`${API_BASE}/${blastId}`)
    
    if (!response.ok) {
      console.log(`${colors.red}❌ Failed to fetch blast status${colors.reset}`)
      return
    }
    
    const data = await response.json()
    
    console.log('━'.repeat(60))
    console.log(`${colors.bright}Status:${colors.reset}     ${formatStatus(data.status)}`)
    console.log(`${colors.bright}Message:${colors.reset}    ${data.message.substring(0, 50)}...`)
    console.log('━'.repeat(60))
    console.log(`${colors.bright}Progress:${colors.reset}   ${data.jobProgress || 0}%`)
    console.log(`${colors.bright}Targets:${colors.reset}    ${data.totalTargets || data.targetCount}`)
    console.log(`${colors.green}✅ Sent:${colors.reset}     ${data.sentCount}`)
    console.log(`${colors.red}❌ Failed:${colors.reset}   ${data.failedCount}`)
    console.log('━'.repeat(60))
    console.log(`${colors.bright}Created:${colors.reset}    ${formatDate(data.createdAt)}`)
    console.log(`${colors.bright}Completed:${colors.reset}  ${formatDate(data.completedAt)}`)
    
    if (data.status === 'PROCESSING') {
      console.log(`\n${colors.cyan}⚡ Blast sedang berjalan...${colors.reset}`)
      console.log(`${colors.cyan}   Refresh untuk update: node check-blast.js ${blastId}${colors.reset}`)
    } else if (data.status === 'COMPLETED') {
      const successRate = Math.round((data.sentCount / (data.totalTargets || data.targetCount)) * 100)
      console.log(`\n${colors.green}✅ Blast selesai! Success rate: ${successRate}%${colors.reset}`)
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message)
  }
}

async function checkBlastHistory(filter = null) {
  console.log(`${colors.bright}📋 Recent Blasts${colors.reset}\n`)
  
  try {
    let url = `${API_BASE}/history?limit=10`
    if (filter === 'active') {
      console.log(`${colors.cyan}Filtering: Active blasts only${colors.reset}\n`)
      // We'll filter client-side
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.log(`${colors.red}❌ Failed to fetch history${colors.reset}`)
      return
    }
    
    const data = await response.json()
    let blasts = data.blasts || []
    
    if (filter === 'active') {
      blasts = blasts.filter(b => b.status === 'QUEUED' || b.status === 'PROCESSING')
    }
    
    if (blasts.length === 0) {
      console.log(`${colors.yellow}📭 No blasts found${colors.reset}`)
      return
    }
    
    console.log('━'.repeat(100))
    console.log(
      `${colors.bright}ID${' '.repeat(30)} | Status${' '.repeat(8)} | Targets | Sent | Failed | Created${colors.reset}`
    )
    console.log('━'.repeat(100))
    
    blasts.forEach(blast => {
      const idShort = blast.id.substring(0, 30)
      const status = formatStatus(blast.status)
      const targets = String(blast.totalTargets).padStart(7)
      const sent = String(blast.sentCount).padStart(4)
      const failed = String(blast.failedCount).padStart(6)
      const created = formatDate(blast.createdAt).substring(0, 17)
      
      console.log(`${idShort} | ${status} | ${targets} | ${sent} | ${failed} | ${created}`)
      
      if (blast.outlet) {
        console.log(`${colors.cyan}  └─ ${blast.outlet.name} (${blast.outlet.whatsappNumber})${colors.reset}`)
      }
      console.log(`  ${colors.reset}${blast.message}${colors.reset}`)
      console.log('')
    })
    
    console.log('━'.repeat(100))
    console.log(`\n${colors.bright}Total:${colors.reset} ${blasts.length} blast(s)`)
    console.log(`\n${colors.cyan}💡 Check specific blast: node check-blast.js <blastId>${colors.reset}`)
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message)
  }
}

// Main
const args = process.argv.slice(2)

if (args.length === 0) {
  checkBlastHistory()
} else if (args[0] === '--active' || args[0] === '-a') {
  checkBlastHistory('active')
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log(`
${colors.bright}Blast Status Checker${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node check-blast.js                    Show all recent blasts
  node check-blast.js <blastId>          Check specific blast status
  node check-blast.js --active           Show only active blasts (QUEUED/PROCESSING)
  node check-blast.js --help             Show this help

${colors.cyan}Examples:${colors.reset}
  node check-blast.js
  node check-blast.js cm4pn1234567890
  node check-blast.js --active
  `)
} else {
  checkSpecificBlast(args[0])
}
