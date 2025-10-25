/**
 * Worker Initialization
 * 
 * This file starts all background workers for the application.
 * Import and call this from your server startup (e.g., instrumentation.ts or server.ts)
 */

import { startBlastWorker } from '@/lib/queue'
import { processBlastJob } from './blast.worker'

let workersStarted = false

export function startWorkers() {
  // Prevent multiple initializations
  if (workersStarted) {
    console.log('[Workers] Already started, skipping initialization')
    return
  }

  console.log('[Workers] Starting background workers...')

  try {
    // Start blast worker
    startBlastWorker(processBlastJob)
    console.log('[Workers] Blast worker started successfully')

    workersStarted = true
    console.log('[Workers] All workers initialized')
  } catch (error) {
    console.error('[Workers] Error starting workers:', error)
    throw error
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Workers] SIGTERM received, shutting down gracefully...')
  // BullMQ workers will close automatically
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Workers] SIGINT received, shutting down gracefully...')
  process.exit(0)
})
