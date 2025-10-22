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

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const outlets = await prisma.outlet.findMany({
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
    const { namaOutlet, alamat, telepon, whatsappNumber } = body

    if (!namaOutlet || !alamat || !telepon || !whatsappNumber) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      )
    }

    const newOutlet = await prisma.outlet.create({
      data: { namaOutlet, alamat, telepon, whatsappNumber },
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