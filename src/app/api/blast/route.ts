import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Simulate WhatsApp API response
interface BlastResult {
  customerId: string
  customerName: string
  whatsappNumber: string
  success: boolean
  error?: string
}

// Mock WhatsApp sending function
const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
  
  // Simulate 95% success rate
  return Math.random() > 0.05
}

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
    if (session.user.role === 'USER') {
      if (!session.user.outletId) {
        return NextResponse.json({ blasts: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } })
      }
      // For USER, we'll filter by outlet later since we don't have userId in blast history yet
    }

    // For now, return mock blast history since we don't have blast table
    const mockBlasts = [
      {
        id: '1',
        message: 'Promo spesial hari ini! Diskon 50% untuk semua produk. Jangan sampai terlewat!',
        targetCount: 25,
        sentCount: 24,
        failedCount: 1,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'completed'
      },
      {
        id: '2',
        message: 'Selamat pagi! Kami memiliki koleksi baru yang menarik untuk Anda.',
        targetCount: 18,
        sentCount: 18,
        failedCount: 0,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'completed'
      }
    ]

    return NextResponse.json({
      blasts: mockBlasts,
      pagination: {
        page,
        limit,
        total: mockBlasts.length,
        totalPages: Math.ceil(mockBlasts.length / limit),
        hasNext: false,
        hasPrev: false
      }
    })

  } catch (error) {
    console.error('Error fetching blast history:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST /api/blast - Send WhatsApp blast
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, outletIds } = body

    console.log('Blast request from user:', session.user.noHp || session.user.email, 'role:', session.user.role)

    // Validate message
    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Pesan terlalu panjang (maksimal 1000 karakter)' }, { status: 400 })
    }

    // Build where clause for target customers
    let whereClause: any = {}
    const { role, outletId: userOutletId } = session.user

    if (role === 'USER') {
      // USER can only send to their outlet
      if (!userOutletId) {
        return NextResponse.json({ 
          error: 'Anda tidak terhubung dengan outlet manapun. Hubungi administrator.' 
        }, { status: 400 })
      }
      whereClause.outletId = userOutletId
    } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
      // ADMIN and SUPERADMIN can choose outlets
      if (outletIds && outletIds.length > 0) {
        whereClause.outletId = { in: outletIds }
      }
      // If no outlet specified, send to all outlets
    }

    // Get target customers
    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: { 
        id: true, 
        nama: true, 
        noWa: true,
        outlet: {
          select: {
            namaOutlet: true
          }
        }
      },
      orderBy: { nama: 'asc' }
    })

    if (customers.length === 0) {
      return NextResponse.json({ 
        error: 'Tidak ada pelanggan yang ditemukan untuk dikirim blast' 
      }, { status: 404 })
    }

    console.log(`Sending blast to ${customers.length} customers`)

    // Send WhatsApp messages
    const results: BlastResult[] = []
    let sentCount = 0
    let failedCount = 0

    for (const customer of customers) {
      try {
        const success = await sendWhatsAppMessage(customer.noWa, message)
        
        results.push({
          customerId: customer.id,
          customerName: customer.nama,
          whatsappNumber: customer.noWa,
          success,
          error: success ? undefined : 'Failed to send message'
        })

        if (success) {
          sentCount++
        } else {
          failedCount++
        }
      } catch (error) {
        results.push({
          customerId: customer.id,
          customerName: customer.nama,
          whatsappNumber: customer.noWa,
          success: false,
          error: 'Network error'
        })
        failedCount++
      }
    }

    console.log(`Blast completed: ${sentCount} sent, ${failedCount} failed`)

    // Return results
    const successMessage = failedCount === 0 
      ? `Blast berhasil dikirim ke semua ${sentCount} pelanggan! 🎉`
      : `Blast selesai: ${sentCount} berhasil, ${failedCount} gagal dari total ${customers.length} pelanggan.`

    return NextResponse.json({
      success: true,
      message: successMessage,
      totalTargets: customers.length,
      sentCount,
      failedCount,
      results: results.map(r => ({
        customerName: r.customerName,
        whatsappNumber: r.whatsappNumber,
        success: r.success,
        error: r.error
      })),
      blastId: `mock-${Date.now()}` // Mock ID since we don't have blast table
    }, { status: 200 })

  } catch (error) {
    console.error('Error sending blast:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengirim blast. Silakan coba lagi.' 
    }, { status: 500 })
  }
}

// GET /api/blast/outlets - Get available outlets for blast selection
export async function GET_OUTLETS(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let whereClause: any = {}
    
    // USER can only see their outlet
    if (session.user.role === 'USER') {
      if (!session.user.outletId) {
        return NextResponse.json({ outlets: [] })
      }
      whereClause.id = session.user.outletId
    }

    const outlets = await prisma.outlet.findMany({
      where: whereClause,
      select: {
        id: true,
        namaOutlet: true,
        _count: {
          select: {
            customers: true
          }
        }
      },
      orderBy: {
        namaOutlet: 'asc'
      }
    })

    return NextResponse.json({ outlets })

  } catch (error) {
    console.error('Error fetching outlets for blast:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}