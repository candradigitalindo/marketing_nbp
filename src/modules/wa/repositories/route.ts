import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WhatsAppRepository } from '@/modules/wa/repositories/whatsapp.repository'

interface Params {
  params: {
    whatsappNumber: string
  }
}

const waRepo = new WhatsAppRepository()

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
    const result = waRepo.getStatus(whatsappNumber)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error getting status for ${whatsappNumber}:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}