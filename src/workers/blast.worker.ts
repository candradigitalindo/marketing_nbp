import { Job } from 'bullmq'
import { BlastJobData } from '@/lib/queue'
import { WhatsAppService } from '@/modules/wa/services/whatsapp.service'
import { prisma } from '@/lib/prisma'

const whatsappService = new WhatsAppService()

export async function processBlastJob(job: Job<BlastJobData>): Promise<void> {
  const { blastId, message, outletIds, customerIds, userId, userRole, userOutletId, mediaFiles, sendMode } = job.data

  console.log(`[Blast Worker] Processing blast job ${job.id} for blast ${blastId}`)

  try {
    // Update blast status to PROCESSING
    await prisma.blast.update({
      where: { id: blastId },
      data: { status: 'PROCESSING' },
    })

    // Update job progress
    await job.updateProgress(0)

    // Convert base64 back to Buffer for media files
    const mediaFilesWithBuffer = mediaFiles?.map(file => ({
      buffer: Buffer.from(file.base64, 'base64'),
      fileName: file.fileName,
      mimetype: file.mimetype,
    }))

    // Execute the blast
    const result = await whatsappService.sendBlast(
      { message, outletIds, customerIds },
      userRole as any,
      userOutletId,
      mediaFilesWithBuffer,
      sendMode
    )

    // Update job progress to 100%
    await job.updateProgress(100)

    // Update blast record with results
    await prisma.blast.update({
      where: { id: blastId },
      data: {
        status: 'COMPLETED',
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        completedAt: new Date(),
      },
    })

    console.log(`[Blast Worker] ✅ Blast ${blastId} completed: ${result.sentCount} sent, ${result.failedCount} failed`)

  } catch (error) {
    console.error(`[Blast Worker] ❌ Blast ${blastId} failed:`, error)

    // Update blast status to FAILED
    await prisma.blast.update({
      where: { id: blastId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    })

    throw error // Re-throw to mark job as failed
  }
}
