import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WhatsAppRepository } from '@/modules/wa/repositories/whatsapp.repository'
import QRCode from 'qrcode'

interface Params {
  params: {
    whatsappNumber: string
  }
}

const waRepo = new WhatsAppRepository()

const normalizeQr = (value: string | null | undefined) => {
  if (!value) return null
  return value.replace(/\s+/g, '')
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { whatsappNumber } = params
  if (!whatsappNumber) {
    return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 })
  }

  try {
    const reset = request.nextUrl.searchParams.get('reset')
    if (reset) {
      console.log(`[QR API] Reset requested for ${whatsappNumber}`)
      await waRepo.reset(whatsappNumber)
      // Give some time for reset to take effect
      await new Promise((r) => setTimeout(r, 500))
    }

    // Get status
    const status = await waRepo.getStatus(whatsappNumber)

    // If already connected, return success
    if (status.status === 'connected') {
      return NextResponse.json({
        status: 'connected',
        name: status.name ?? null,
        qrCode: null,
        deviceInfo: status.deviceInfo ?? null,
      })
    }

    // For connecting status: get fresh QR code
    const qrCode = await waRepo.getQRCode(whatsappNumber)

    // Check status again
    const finalStatus = await waRepo.getStatus(whatsappNumber)

    // If connected during QR fetch, return connected
    if (finalStatus.status === 'connected') {
      return NextResponse.json({
        status: 'connected',
        name: finalStatus.name ?? null,
        qrCode: null,
        deviceInfo: finalStatus.deviceInfo ?? null,
      })
    }

    // Convert QR string to DataURL if available
    let qrDataUrl: string | null = null
    if (qrCode) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrCode)
      } catch (err) {
        console.error(`[QR API] Failed to convert QR to DataURL:`, err)
      }
    }

    return NextResponse.json({
      status: finalStatus.status === 'disconnected' ? 'disconnected' : 'connecting',
      name: finalStatus.name ?? status.name ?? null,
      qrCode: qrDataUrl,
      deviceInfo: finalStatus.deviceInfo ?? status.deviceInfo ?? null,
    })
  } catch (error) {
    console.error(`[QR API] Error:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}