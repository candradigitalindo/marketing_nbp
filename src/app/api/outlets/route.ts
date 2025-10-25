import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/outlets
 * Mengambil semua data outlet, hanya untuk SUPERADMIN.
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session
  let whereClause: any = {}

  // Filter by role
  if (user.role === 'USER') {
    if (!user.outletId) {
      // User is not assigned to an outlet, return empty
      return NextResponse.json({ outlets: [] })
    }
    whereClause.id = user.outletId
  }
  // SUPERADMIN and ADMIN can see all outlets

  try {
    const outlets = await prisma.outlet.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
          },
        },
      },
      orderBy: {
        namaOutlet: 'asc',
      },
    })
    return NextResponse.json({ outlets })
  } catch (error) {
    console.error('Error fetching outlets:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/outlets
 * Membuat outlet baru, hanya untuk SUPERADMIN.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { namaOutlet, alamat, whatsappNumber } = body

    if (!namaOutlet || !alamat || !whatsappNumber) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      )
    }

    const newOutlet = await prisma.outlet.create({
      data: { namaOutlet, alamat, whatsappNumber },
    })

    return NextResponse.json({ outlet: newOutlet }, { status: 201 })
  } catch (error) {
    console.error('Error creating outlet:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}