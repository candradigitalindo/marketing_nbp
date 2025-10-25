import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import BaileysService from '@/modules/wa/services/baileys.service'

/**
 * POST /api/outlets/check-number
 * Check if a WhatsApp number is valid and active
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { whatsappNumber } = body

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp harus diisi' },
        { status: 400 }
      )
    }

    // Check if number is valid on WhatsApp
    // Add API-level timeout to prevent hanging
    const baileysService = BaileysService
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API timeout: phone check exceeded 30s')), 30_000)
    })

    let result: any
    try {
      result = await Promise.race([
        baileysService.checkPhoneNumberValid(whatsappNumber),
        timeoutPromise
      ])
    } catch (timeoutError) {
      console.warn(`[API] Phone check timeout for ${whatsappNumber}:`, timeoutError)
      return NextResponse.json(
        { 
          valid: true,
          exists: false,
          message: 'Verifikasi WhatsApp sedang diproses (timeout). Format nomor valid, silakan lanjutkan atau coba verifikasi lagi.'
        },
        { status: 200 }
      )
    }

    console.log(`[API] Check number result for ${whatsappNumber}:`, result)

    // Always return 200 - let client handle the valid/exists flags
    // This allows better UX for cases like "session not connected yet"
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error checking WhatsApp number:', error)
    return NextResponse.json(
      { 
        valid: true,
        exists: false,
        message: 'Nomor format valid. Silakan hubungkan WhatsApp untuk verifikasi lengkap.'
      },
      { status: 200 }
    )
  }
}
