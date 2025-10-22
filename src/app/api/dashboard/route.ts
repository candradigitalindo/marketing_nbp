import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Dashboard API called by user:', session.user.email, 'role:', session.user.role)

    const { user } = session

    // Define a filter for customer queries based on user role
    const customerWhere =
      user.role === 'USER' && user.outletId ? { outletId: user.outletId } : {}

    // Parallelize database queries for efficiency
    const [totalOutlets, totalUsers, totalCustomers] = await Promise.all([
      user.role === 'SUPERADMIN' ? prisma.outlet.count() : Promise.resolve(0),
      user.role === 'SUPERADMIN' ? prisma.user.count() : Promise.resolve(0),
      prisma.customer.count({ where: customerWhere }),
    ])

    // Set default values for blast-related stats since blast model doesn't exist
    const recentBlastsCount = 0
    const totalSent = 0
    const totalTargeted = 0
    const successRate = 0

    const stats = {
      totalOutlets,
      totalCustomers,
      myCustomers: totalCustomers, // For USER role, this is already filtered
      totalUsers,
      recentBlasts: recentBlastsCount,
      successRate: successRate,
    }

    // Get recent activity from database
    const recentCustomers = await prisma.customer.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
        ...customerWhere,
      },
      include: {
        outlet: {
          select: { namaOutlet: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Convert to activity format, handling cases where outlet might be null
    const recentActivity = recentCustomers.map((customer) => ({
      id: customer.id,
      type: 'customer_added',
      message: `Pelanggan baru "${customer.nama}" ditambahkan ${
        customer.outlet ? `di ${customer.outlet.namaOutlet}` : ''
      }`,
      timestamp: customer.createdAt.toISOString(),
    }))

    // Add a simulated blast activity for demonstration
    if (recentActivity.length < 5 && stats.totalCustomers > 0) {
      recentActivity.push({
        id: 'blast_mock_1',
        type: 'blast_sent',
        message: `Blast "Promo Spesial" dikirim ke ${Math.min(
          stats.totalCustomers,
          50
        )} pelanggan`,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      })
    }

    console.log('Dashboard stats:', stats)
    console.log('Recent activity count:', recentActivity.length)

    const response = { 
      stats, 
      recentActivity: recentActivity
        .sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Dashboard API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, 
      { status: 500 }
    )
  }
}