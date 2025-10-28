import { Job } from 'bullmq'
import { BlastJobData } from '@/lib/queue'
import { WhatsAppService } from '@/modules/wa/services/whatsapp.service'
import { prisma } from '@/lib/prisma'

const whatsappService = new WhatsAppService()

export async function processBlastJob(job: Job<BlastJobData>): Promise<void> {
  const { blastId, message, outletIds, customerIds, userId, userRole, userOutletId, mediaFiles, sendMode, skipSentCustomers } = job.data

  console.log(`[Blast Worker] Processing blast job ${job.id} for blast ${blastId}`)
  console.log(`[Blast Worker] Skip sent customers: ${skipSentCustomers}`)

  try {
    // Update blast status to PROCESSING
    await prisma.blast.update({
      where: { id: blastId },
      data: { status: 'PROCESSING' },
    })

    // Update job progress
    await job.updateProgress(0)

    // Get list of customer IDs to exclude if skipSentCustomers is enabled
    let excludeCustomerIds: string[] = []
    if (skipSentCustomers) {
      const sentReports = await prisma.blastReport.findMany({
        where: {
          status: 'sent',
          // Only exclude if same message content (to avoid excluding from different campaigns)
          blast: {
            message: message,
          }
        },
        select: {
          customerId: true,
        },
        distinct: ['customerId'],
      })
      excludeCustomerIds = sentReports.map(r => r.customerId)
      console.log(`[Blast Worker] Excluding ${excludeCustomerIds.length} customers who already received this message`)
    }

    // Convert base64 back to Buffer for media files
    const mediaFilesWithBuffer = mediaFiles?.map(file => ({
      buffer: Buffer.from(file.base64, 'base64'),
      fileName: file.fileName,
      mimetype: file.mimetype,
    }))

    // Execute the blast
    const result = await whatsappService.sendBlast(
      { message, outletIds, customerIds, excludeCustomerIds },
      userRole as any,
      userOutletId,
      mediaFilesWithBuffer,
      sendMode
    )

    // Update job progress to 50% after sending
    await job.updateProgress(50)

    // Save blast reports for each target
    console.log(`[Blast Worker] Saving ${result.results.length} blast reports`)
    
    for (const r of result.results) {
      try {
        await prisma.blastReport.create({
          data: {
            blastId,
            customerId: r.customerId,
            customerName: r.customerName,
            customerPhone: r.whatsappNumber,
            status: r.success ? 'sent' : 'failed',
            sentAt: r.success ? r.timestamp : null,
            errorMessage: r.success ? null : r.message,
            waMessageId: r.success ? `msg_${Date.now()}` : null,
          },
        })
      } catch (reportError) {
        console.error(`[Blast Worker] Failed to save report for ${r.customerName}:`, reportError)
        // Continue even if report save fails
      }
    }

    console.log(`[Blast Worker] ✅ Blast reports saved`)

    // Update job progress to 100%
    await job.updateProgress(100)

    // Update blast record with results AND targetCount
    await prisma.blast.update({
      where: { id: blastId },
      data: {
        status: 'COMPLETED',
        targetCount: result.totalTargets,
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
