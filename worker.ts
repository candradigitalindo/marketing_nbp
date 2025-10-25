#!/usr/bin/env tsx

/**
 * Standalone Worker Process
 * 
 * Menjalankan BullMQ worker secara terpisah dari Next.js
 * Gunakan: npm run worker
 */

import { startBlastWorker } from './src/lib/queue'
import { processBlastJob } from './src/workers/blast.worker'

console.log('━'.repeat(60))
console.log('🚀 Starting Blast Worker...')
console.log('━'.repeat(60))

try {
  // Start worker
  startBlastWorker(processBlastJob)
  
  console.log('✅ Blast worker started successfully')
  console.log('⏳ Worker is now listening for jobs...')
  console.log('')
  console.log('💡 Tips:')
  console.log('  - Send blast via UI: http://localhost:3000/blast')
  console.log('  - Monitor queue: ./check-queue.sh')
  console.log('  - Check blasts: node check-blast.js')
  console.log('')
  console.log('Press Ctrl+C to stop worker')
  console.log('━'.repeat(60))
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down worker gracefully...')
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down worker gracefully...')
    process.exit(0)
  })
  
} catch (error) {
  console.error('❌ Error starting worker:', error)
  process.exit(1)
}
