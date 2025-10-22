import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { user } = session

    // Parallelize database queries
    const [totalOutlets, totalUsers, totalCustomers, myCustomers] = await Promise.all([
      prisma.outlet.count(),
      prisma.user.count(),
      prisma.customer.count(),
      user.role === 'USER' && user.outletId
        ? prisma.customer.count({ where: { outletId: user.outletId } })
        : 0,
    ])

    // Mock data for features that are not yet fully implemented
    const recentBlasts = 12 // Mock
    const successRate = 95 // Mock

    const stats = {
      totalOutlets,
      totalCustomers: user.role === 'USER' ? myCustomers : totalCustomers,
      myCustomers,
      recentBlasts,
      totalUsers,
      successRate,
    }

    // Mock recent activity data
    const recentActivity = [
      {
        id: 1,
        type: 'blast_sent',
        message: 'Mengirim blast ke 50 pelanggan',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        type: 'customer_added',
        message: 'Pelanggan baru "Budi Santoso" ditambahkan',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        type: 'blast_sent',
        message: 'Mengirim blast "Promo Akhir Pekan"',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    return NextResponse.json({ stats, recentActivity })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}