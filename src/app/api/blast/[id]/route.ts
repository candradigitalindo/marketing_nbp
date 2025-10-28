import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBlastQueue } from '@/lib/queue'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blastId = params.id

    // Get blast from database
    const blast = await prisma.blast.findUnique({
      where: { id: blastId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        reports: {
          select: {
            id: true,
            customerId: true,
            status: true,
            customerName: true,
            customerPhone: true,
            sentAt: true,
            errorMessage: true,
          },
          orderBy: {
            sentAt: 'desc',
          },
        },
      },
    })

    if (!blast) {
      return NextResponse.json({ error: 'Blast not found' }, { status: 404 })
    }

    // Check authorization based on role
    if (session.user.role === 'USER') {
      // USER can only access blasts from their outlet
      if (blast.outletId !== session.user.outletId) {
        return NextResponse.json({ 
          error: 'Forbidden: You can only access blasts from your outlet' 
        }, { status: 403 })
      }
    }
    // ADMIN and SUPERADMIN can access all blasts (no restriction)

    // Get job status from queue
    const queue = getBlastQueue()
    const job = await queue.getJob(blastId)

    let jobProgress: any = 0
    let jobState = 'unknown'

    if (job) {
      jobProgress = job.progress || 0
      jobState = await job.getState()
    }

    // Separate sent and failed reports
    const sentReports = blast.reports.filter(r => r.status === 'sent')
    const failedReports = blast.reports.filter(r => r.status === 'failed')

    return NextResponse.json({
      blast: {
        id: blast.id,
        message: blast.message,
        status: blast.status,
        targetCount: blast.targetCount,
        sentCount: blast.sentCount,
        failedCount: blast.failedCount,
        createdAt: blast.createdAt,
        completedAt: blast.completedAt,
        sendMode: blast.sendMode,
        user: blast.user,
      },
      job: {
        id: job?.id,
        progress: jobProgress,
        state: jobState,
      },
      reports: blast.reports,
      sent: sentReports,
      failed: failedReports,
    })

  } catch (error) {
    console.error('[Blast Status API] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
