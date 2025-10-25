import { Queue, Worker, Job } from 'bullmq'
import { getRedisConnection } from './redis'

// Queue name
export const BLAST_QUEUE_NAME = 'blast-jobs'

// Job data interface
export interface BlastJobData {
  blastId: string
  message: string
  outletIds?: string[]
  customerIds?: string[]
  userId: string
  userRole: string
  userOutletId: string | null
  mediaFiles?: {
    base64: string  // Changed from buffer: Buffer to base64: string
    fileName: string
    mimetype: string
  }[]
  sendMode: 'separate' | 'caption'
}

// Create queue instance
let blastQueue: Queue<BlastJobData> | null = null

export function getBlastQueue(): Queue<BlastJobData> {
  if (!blastQueue) {
    const connection = getRedisConnection()
    
    blastQueue = new Queue<BlastJobData>(BLAST_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 1, // No retry for blast jobs (each message has its own retry)
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 200, // Keep last 200 failed jobs
          age: 7 * 24 * 3600, // Keep for 7 days
        },
      },
    })

    console.log('[Queue] Blast queue initialized')
  }

  return blastQueue
}

// Worker processor function type
export type BlastJobProcessor = (job: Job<BlastJobData>) => Promise<void>

// Create worker instance
let blastWorker: Worker<BlastJobData> | null = null

export function startBlastWorker(processor: BlastJobProcessor) {
  if (blastWorker) {
    console.log('[Worker] Blast worker already running')
    return blastWorker
  }

  const connection = getRedisConnection()

  blastWorker = new Worker<BlastJobData>(
    BLAST_QUEUE_NAME,
    processor,
    {
      connection,
      concurrency: 1, // Process one blast at a time to avoid rate limits
      limiter: {
        max: 1, // Max 1 job
        duration: 1000, // per 1 second
      },
    }
  )

  blastWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`)
  })

  blastWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err)
  })

  blastWorker.on('error', (err) => {
    console.error('[Worker] Worker error:', err)
  })

  console.log('[Worker] Blast worker started')
  return blastWorker
}

export async function stopBlastWorker() {
  if (blastWorker) {
    await blastWorker.close()
    blastWorker = null
    console.log('[Worker] Blast worker stopped')
  }
}

// Cleanup function
export async function cleanupQueue() {
  await stopBlastWorker()
  
  if (blastQueue) {
    await blastQueue.close()
    blastQueue = null
  }
}
