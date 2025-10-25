import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import baileysService from '@/modules/wa/services/baileys.service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { outletId } = body

    if (!outletId) {
      return NextResponse.json({ error: 'outletId is required' }, { status: 400 })
    }

    // Disconnect the session (soft disconnect - keeps credentials)
    await baileysService.disconnectSession(outletId)

    return NextResponse.json({
      success: true,
      message: 'Koneksi WhatsApp terputus'
    })
  } catch (error) {
    console.error('[Disconnect API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect session' },
      { status: 500 }
    )
  }
}
