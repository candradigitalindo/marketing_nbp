import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WhatsAppService } from '@/modules/wa/services/whatsapp.service'

const whatsappService = new WhatsAppService()

// GET /api/blast/qr/[whatsappNumber]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ whatsappNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const qrResult = await whatsappService.getQRCode(resolvedParams.whatsappNumber)
    return NextResponse.json(qrResult)
  } catch (error) {
    console.error('Error getting QR code:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}