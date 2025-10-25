import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/modules/wa/services/whatsapp.service'
import { z } from 'zod'

const whatsappService = new WhatsAppService()

// GET /api/blast - Get blast history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // For now, return mock blast history since we don't have blast table yet
    // When you have the blast table, uncomment and use the code below:

    /*
    // Build where clause based on role
    let whereClause: any = {}
    if (session.user.role === 'USER' && session.user.outletId) {
      // USER only sees blasts from their outlet users
      const usersInOutlet = await prisma.user.findMany({
        where: { outletId: session.user.outletId },
        select: { id: true },
      })
      whereClause.userId = { in: usersInOutlet.map(u => u.id) }
    }

    const [blasts, total] = await Promise.all([
      prisma.blast.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              nama: true,
              outlet: {
                select: { namaOutlet: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.blast.count({ where: whereClause }),
    ])
    */

    // Mock data for now
    const mockBlasts = [
      {
        id: '1',
        message: 'Promo spesial hari ini! Diskon 50% untuk semua produk. Jangan sampai terlewat!',
        targetCount: 25,
        sentCount: 24,
        failedCount: 1,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'completed',
        user: {
          nama: session.user.name,
          outlet: { namaOutlet: 'Outlet Demo' }
        }
      },
      {
        id: '2',
        message: 'Selamat pagi! Kami memiliki koleksi baru yang menarik untuk Anda.',
        targetCount: 18,
        sentCount: 18,
        failedCount: 0,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'completed',
        user: {
          nama: session.user.name,
          outlet: { namaOutlet: 'Outlet Demo' }
        }
      }
    ]

    const total = mockBlasts.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      blasts: mockBlasts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    })

  } catch (error) {
    console.error('Error fetching blast history:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/blast - Send WhatsApp blast
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      console.warn('[Blast API] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Blast API] Blast request from user: ${session.user.name || session.user.email} (${session.user.role})`)

    // Parse FormData for file uploads
    const formData = await request.formData()
    const message = formData.get('message') as string
    const outletIdsStr = formData.get('outletIds') as string | null
    const customerIdsStr = formData.get('customerIds') as string | null
    const sendMode = (formData.get('sendMode') as 'separate' | 'caption') || 'separate'
    
    const outletIds = outletIdsStr ? JSON.parse(outletIdsStr) : undefined
    const customerIds = customerIdsStr ? JSON.parse(customerIdsStr) : undefined

    console.log(`[Blast API] Payload - message length: ${message?.length || 0}, outletIds: ${outletIds?.length || 0}, customerIds: ${customerIds?.length || 0}`)
    console.log(`[Blast API] Send mode: ${sendMode}`)

    // Validate message
    if (!message || message.trim() === '') {
      console.warn('[Blast API] Empty message rejected')
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    if (message.length > 4000) {
      console.warn(`[Blast API] Message too long: ${message.length} characters`)
      return NextResponse.json({ error: 'Pesan terlalu panjang (maksimal 4000 karakter)' }, { status: 400 })
    }

    // Process uploaded files
    const mediaFiles: { buffer: Buffer; fileName: string; mimetype: string }[] = []
    const files = formData.getAll('files') as File[]
    
    if (files.length > 0) {
      console.log(`[Blast API] Processing ${files.length} uploaded files`)
      
      for (const file of files) {
        if (file instanceof File && file.size > 0) {
          // Validate file size (16MB max)
          if (file.size > 16 * 1024 * 1024) {
            console.warn(`[Blast API] File ${file.name} too large: ${file.size} bytes`)
            return NextResponse.json({ 
              error: `File ${file.name} terlalu besar. Maksimal 16MB` 
            }, { status: 400 })
          }

          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          mediaFiles.push({
            buffer,
            fileName: file.name,
            mimetype: file.type
          })
          
          console.log(`[Blast API] File processed: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`)
        }
      }
    }

    console.log(`[Blast API] Calling whatsappService.sendBlast with role: ${session.user.role}, outletId: ${session.user.outletId}`)

    const result = await whatsappService.sendBlast(
      { message, outletIds, customerIds },
      session.user.role,
      session.user.outletId,
      mediaFiles.length > 0 ? mediaFiles : undefined,
      sendMode
    )

    console.log(`[Blast API] sendBlast completed - success: ${result.success}, sent: ${result.sentCount}, failed: ${result.failedCount}`)

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('[Blast API] Error sending blast:', error)
    if (error instanceof z.ZodError) {
      console.error('[Blast API] Validation error:', error.issues)
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Terjadi kesalahan saat mengirim blast: ${errorMessage}` }, { status: 500 })
  }
}