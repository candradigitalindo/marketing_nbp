import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

interface Params {
  params: {
    id: string
  }
}

/**
 * PUT /api/users/[id]
 * Memperbarui data pengguna, hanya untuk SUPERADMIN.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  const { id } = params

  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, noHp, email, password, role, outletId } = body

    if (!name || !noHp || !role) {
      return NextResponse.json({ error: 'Field nama, noHp, dan role harus diisi' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { noHp } })
    if (existingUser && existingUser.id !== id) {
      return NextResponse.json({ error: 'Nomor Handphone sudah digunakan oleh pengguna lain' }, { status: 409 })
    }

    const dataToUpdate: any = {
      name,
      noHp,
      email: email || null,
      role,
      outletId: role === 'SUPERADMIN' ? null : outletId || null,
    }

    if (password) {
      dataToUpdate.password = await hash(password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error(`Error updating user ${id}:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * DELETE /api/users/[id]
 * Menghapus pengguna, hanya untuk SUPERADMIN.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  const { id } = params

  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' }, { status: 403 })
  }

  try {
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Pengguna berhasil dihapus' })
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error)
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 })
  }
}