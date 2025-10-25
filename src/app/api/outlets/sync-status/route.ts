import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import baileysService from '@/modules/wa/services/baileys.service'

// POST /api/outlets/sync-status - Force sync outlet WhatsApp status
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { outletId } = body

    if (!outletId) {
      return NextResponse.json({ error: 'outletId is required' }, { status: 400 })
    }

    console.log(`[Sync API] Syncing status for outlet ${outletId}`)

    // Force refresh the outlet status (now with retries and better verification)
    const result = await baileysService.forceRefreshStatus(outletId)

    console.log(`[Sync API] Sync completed: status=${result.status}, name=${result.name}, hasQR=${!!result.qrCode}`)

    // Create appropriate message based on status
    let message = ''
    if (result.status === 'CONNECTED') {
      message = `✅ Terhubung sebagai ${result.name || 'Unknown Device'}`
    } else if (result.status === 'CONNECTING') {
      if (result.qrCode) {
        message = '📱 QR code tersedia - silakan scan untuk menghubungkan'
      } else {
        message = '🔄 Mencoba menghubungkan otomatis...'
      }
    } else {
      // DISCONNECTED
      message = '❌ Tidak terhubung - klik "Hubungkan" untuk scan QR code baru'
    }

    return NextResponse.json({
      success: true,
      message: message,
      status: result.status,
      name: result.name,
      hasQR: !!result.qrCode,
    })
  } catch (error) {
    console.error('[Sync API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to sync status', details: String(error) },
      { status: 500 }
    )
  }
}
