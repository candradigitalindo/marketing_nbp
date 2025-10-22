import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    id: string
  }
}

/**
 * PUT /api/outlets/[id]
 * Memperbarui data outlet, hanya untuk SUPERADMIN.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  const { id } = params

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { namaOutlet, alamat, telepon, whatsappNumber } = body

    const updatedOutlet = await prisma.outlet.update({
      where: { id },
      data: { namaOutlet, alamat, telepon, whatsappNumber },
    })

    return NextResponse.json({ outlet: updatedOutlet })
  } catch (error) {
    console.error(`Error updating outlet ${id}:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/outlets/[id]
 * Menghapus outlet, hanya untuk SUPERADMIN.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  const { id } = params

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.outlet.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Outlet deleted successfully' })
  } catch (error) {
    console.error(`Error deleting outlet ${id}:`, error)
    return NextResponse.json(
      { error: 'Gagal menghapus outlet, mungkin masih ada user atau customer yang terkait.' },
      { status: 500 }
    )
  }
}