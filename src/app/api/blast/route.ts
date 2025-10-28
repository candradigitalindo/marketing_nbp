import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/modules/wa/services/whatsapp.service'
import { getBlastQueue } from '@/lib/queue'
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

    // Build where clause based on role
    let whereClause: any = {}
    if (session.user.role === 'USER' && session.user.outletId) {
      // USER only sees blasts from their outlet
      whereClause.outletId = session.user.outletId
    } else if (session.user.role === 'ADMIN') {
      // ADMIN sees all blasts
      // No filter needed
    }

    const [blasts, total] = await Promise.all([
      prisma.blast.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
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

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      blasts,
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
    const skipSentCustomers = formData.get('skipSentCustomers') === 'true'
    
    const outletIds = outletIdsStr ? JSON.parse(outletIdsStr) : undefined
    const customerIds = customerIdsStr ? JSON.parse(customerIdsStr) : undefined

    console.log(`[Blast API] Payload - message length: ${message?.length || 0}, outletIds: ${outletIds?.length || 0}, customerIds: ${customerIds?.length || 0}`)
    console.log(`[Blast API] Send mode: ${sendMode}, skipSentCustomers: ${skipSentCustomers}`)

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

    // Create blast record first
    const blast = await prisma.blast.create({
      data: {
        message,
        targetCount: 0, // Will be updated by worker
        sentCount: 0,
        failedCount: 0,
        userId: session.user.id,
        outletId: session.user.outletId || outletIds?.[0] || '', // Use first outlet if available
        status: 'QUEUED',
        sendMode,
        mediaType: mediaFiles.length > 0 ? mediaFiles[0].mimetype : null,
      },
    })

    console.log(`[Blast API] Blast record created: ${blast.id}`)

    // Add job to queue
    const queue = getBlastQueue()
    
    // Convert Buffer to base64 for Redis serialization
    const mediaFilesForQueue = mediaFiles.map(file => ({
      base64: file.buffer.toString('base64'),
      fileName: file.fileName,
      mimetype: file.mimetype,
    }))
    
    const job = await queue.add(
      `blast-${blast.id}`,
      {
        blastId: blast.id,
        message,
        outletIds,
        customerIds,
        userId: session.user.id,
        userRole: session.user.role,
        userOutletId: session.user.outletId,
        mediaFiles: mediaFilesForQueue,
        sendMode,
        skipSentCustomers,
      },
      {
        jobId: blast.id, // Use blast ID as job ID for easy tracking
      }
    )

    console.log(`[Blast API] Job ${job.id} added to queue`)

    return NextResponse.json({
      success: true,
      message: 'Blast dijadwalkan dan akan diproses di background',
      blastId: blast.id,
      jobId: job.id,
      status: 'QUEUED',
    }, { status: 202 }) // 202 Accepted

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