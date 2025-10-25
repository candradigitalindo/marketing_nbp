import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/blast/history
 * 
 * Get blast history with status
 * For monitoring active and completed blasts
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // QUEUED, PROCESSING, COMPLETED, FAILED

    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status
    }

    // Get blasts
    const blasts = await prisma.blast.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        outlet: {
          select: {
            namaOutlet: true,
            whatsappNumber: true,
          },
        },
      },
    })

    // Format response
    const formatted = blasts.map(blast => ({
      id: blast.id,
      status: blast.status,
      message: blast.message.substring(0, 100) + (blast.message.length > 100 ? '...' : ''),
      totalTargets: blast.targetCount,
      sentCount: blast.sentCount,
      failedCount: blast.failedCount,
      outlet: blast.outlet ? {
        name: blast.outlet.namaOutlet,
        whatsappNumber: blast.outlet.whatsappNumber,
      } : null,
      createdAt: blast.createdAt,
      completedAt: blast.completedAt,
      duration: blast.completedAt && blast.createdAt 
        ? Math.round((blast.completedAt.getTime() - blast.createdAt.getTime()) / 1000)
        : null,
    }))

    return NextResponse.json({
      success: true,
      blasts: formatted,
      count: formatted.length,
    })
  } catch (error) {
    console.error('[API] Error fetching blast history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blast history' },
      { status: 500 }
    )
  }
}
