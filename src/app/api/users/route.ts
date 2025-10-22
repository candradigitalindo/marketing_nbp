import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

/**
 * GET /api/users
 * Mengambil semua data pengguna, hanya untuk SUPERADMIN.
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/users
 * Membuat pengguna baru, hanya untuk SUPERADMIN.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, noHp, email, password, role, outletId } = body

    if (!name || !noHp || !password || !role) {
      return NextResponse.json({ error: 'Field nama, noHp, password, dan role harus diisi' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { noHp } })
    if (existingUser) {
      return NextResponse.json({ error: 'Nomor Handphone sudah digunakan' }, { status: 409 })
    }

    const hashedPassword = await hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        name,
        noHp,
        email: email || null,
        password: hashedPassword,
        role,
        outletId: role === 'SUPERADMIN' ? null : outletId || null,
      },
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}