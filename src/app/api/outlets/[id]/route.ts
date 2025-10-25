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

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session

  // Authorization check:
  // SUPERADMIN can update any outlet.
  // USER can only update their own outlet.
  if (user.role !== 'SUPERADMIN') {
    if (user.role !== 'USER' || user.outletId !== id) {
      // Deny access if not SUPERADMIN, or if USER is trying to edit someone else's outlet.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const body = await request.json()
    const { namaOutlet, alamat, whatsappNumber } = body

    const updatedOutlet = await prisma.outlet.update({
      where: { id },
      data: { namaOutlet, alamat, whatsappNumber },
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

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session

  // Authorization check:
  // SUPERADMIN can update any outlet.
  // USER can only update their own outlet.
  if (user.role !== 'SUPERADMIN') {
    if (user.role !== 'USER' || user.outletId !== id) {
      // Deny access if not SUPERADMIN, or if USER is trying to edit someone else's outlet.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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