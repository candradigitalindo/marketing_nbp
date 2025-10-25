import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import baileysService from '@/modules/wa/services/baileys.service'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Status API] Request from user ${session.user.id} (${session.user.role})`)

    // baileysService is already instantiated and exported

    // Get user's outlets or all outlets based on role
    let outletIds: string[] = []
    
    if (session.user.role === 'USER') {
      // USER only sees their own outlet
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { outlet: true },
      })
      if (user?.outletId) {
        outletIds = [user.outletId]
        console.log(`[Status API] USER ${session.user.id} has outlet ${user.outletId}`)
      }
    } else {
      // ADMIN/SUPERADMIN sees all outlets
      const outlets = await prisma.outlet.findMany({
        select: { id: true },
      })
      outletIds = outlets.map((o) => o.id)
      console.log(`[Status API] ${session.user.role} sees ${outlets.length} outlets`)
    }

    // Get detailed status for each outlet
    const statuses = await Promise.all(
      outletIds.map(async (outletId) => {
        try {
          console.log(`[Status API] Fetching status for outlet ${outletId}...`)
          
          const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            select: {
              id: true,
              namaOutlet: true,
              whatsappNumber: true,
              isWhatsappActive: true,
            },
          })

          const sessionRecord = await prisma.whatsappSession.findFirst({
            where: { outletId },
            select: {
              id: true,
              status: true,
              sessionName: true,
              connectedAt: true,
              qrCode: true,
              lastSeen: true,
              autoReconnect: true,
              retryCount: true,
            },
          })

          // Get live verification status
          console.log(`[Status API] Getting live status for outlet ${outletId}...`)
          const liveStatus = await baileysService.getSessionStatus(outletId, { live: true })
          console.log(`[Status API] Live status for ${outletId}: ${liveStatus.status}`)

          const result = {
            outletId,
            outlet: {
              name: outlet?.namaOutlet,
              whatsappNumber: outlet?.whatsappNumber,
              isActive: outlet?.isWhatsappActive,
            },
            session: {
              status: sessionRecord?.status,
              sessionName: sessionRecord?.sessionName,
              connectedAt: sessionRecord?.connectedAt,
              lastSeen: sessionRecord?.lastSeen,
              qrCode: sessionRecord?.qrCode ? 'Present' : null,
              autoReconnect: sessionRecord?.autoReconnect,
              retryCount: sessionRecord?.retryCount,
            },
            liveStatus: {
              status: liveStatus.status,
              qrCode: liveStatus.qrCode ? 'Present' : null,
              name: liveStatus.name,
            },
            healthy: liveStatus.status === 'CONNECTED',
          }
          
          console.log(`[Status API] Outlet ${outletId}: healthy=${result.healthy}`)
          return result
        } catch (error) {
          console.error(`[Status API] Error fetching status for outlet ${outletId}:`, error)
          return {
            outletId,
            outlet: { name: 'Error', whatsappNumber: null, isActive: false },
            session: { status: 'ERROR', statusName: null },
            liveStatus: { status: 'ERROR' },
            healthy: false,
            error: String(error),
          }
        }
      })
    )

    console.log(`[Status API] Response: ${statuses.length} outlets, ${statuses.filter(s => s.healthy).length} healthy`)

    return NextResponse.json({
      success: true,
      count: statuses.length,
      healthy: statuses.filter((s) => s.healthy).length,
      timestamp: new Date().toISOString(),
      statuses,
    })
  } catch (error) {
    console.error('[Status API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check outlet status', details: String(error) },
      { status: 500 }
    )
  }
}
