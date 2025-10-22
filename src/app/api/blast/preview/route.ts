import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WhatsAppService } from '@/modules/wa/services/whatsapp.service'
import { z } from 'zod'

const whatsappService = new WhatsAppService()

const previewSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  outletIds: z.array(z.string()).optional(),
  customerIds: z.array(z.string()).optional(),
})

// POST /api/blast/preview
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = previewSchema.parse(body)

    const preview = await whatsappService.getBlastPreview(
      validatedData,
      session.user.role,
      session.user.outletId
    )

    return NextResponse.json(preview)
  } catch (error) {
    console.error('Error getting blast preview:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

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