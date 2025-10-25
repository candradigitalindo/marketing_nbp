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

    // Check authorization
    if (session.user.role === 'USER' && blast.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get job status from queue
    const queue = getBlastQueue()
    const job = await queue.getJob(blastId)

    let jobProgress: any = 0
    let jobState = 'unknown'

    if (job) {
      jobProgress = job.progress || 0
      jobState = await job.getState()
    }

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
    })

  } catch (error) {
    console.error('[Blast Status API] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
