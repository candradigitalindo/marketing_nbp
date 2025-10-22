import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/customers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check authorization
    if (session.user.role === 'USER' && session.user.outletId !== customer.outletId) {
      return NextResponse.json(
        { error: 'Tidak memiliki akses ke customer ini' },
        { status: 403 }
      )
    }

    return NextResponse.json(customer)

  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Get existing customer
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check authorization
    if (session.user.role === 'USER' && session.user.outletId !== existingCustomer.outletId) {
      return NextResponse.json(
        { error: 'Tidak memiliki akses untuk mengubah customer ini' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!body.nama || !body.noWa || !body.outletId) {
      return NextResponse.json(
        { error: 'Nama, nomor WhatsApp, dan outlet wajib diisi' },
        { status: 400 }
      )
    }

    // Validate WhatsApp number format
    const waNumber = body.noWa.replace(/\D/g, '')
    if (waNumber.length < 10 || waNumber.length > 15) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp tidak valid' },
        { status: 400 }
      )
    }

    // Check authorization for outlet change
    if (session.user.role === 'USER') {
      if (session.user.outletId !== body.outletId) {
        return NextResponse.json(
          { error: 'Anda hanya dapat memindahkan customer ke outlet Anda sendiri' },
          { status: 403 }
        )
      }
    }

    // Check if outlet exists
    const outlet = await prisma.outlet.findUnique({
      where: { id: body.outletId }
    })

    if (!outlet) {
      return NextResponse.json(
        { error: 'Outlet tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if WhatsApp number already exists (excluding current customer)
    const duplicateCustomer = await prisma.customer.findFirst({
      where: {
        noWa: waNumber,
        outletId: body.outletId,
        id: { not: params.id }
      }
    })

    if (duplicateCustomer) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp sudah terdaftar di outlet ini' },
        { status: 409 }
      )
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        nama: body.nama.trim(),
        noWa: waNumber,
        outletId: body.outletId
      },
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true
          }
        }
      }
    })

    console.log('Customer updated:', updatedCustomer.nama)

    return NextResponse.json(updatedCustomer)

  } catch (error) {
    console.error('Error updating customer:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get existing customer
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        outlet: {
          select: {
            namaOutlet: true
          }
        }
      }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check authorization
    if (session.user.role === 'USER' && session.user.outletId !== existingCustomer.outletId) {
      return NextResponse.json(
        { error: 'Tidak memiliki akses untuk menghapus customer ini' },
        { status: 403 }
      )
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id: params.id }
    })

    console.log('Customer deleted:', existingCustomer.nama, 'from outlet:', existingCustomer.outlet.namaOutlet)

    return NextResponse.json(
      { message: 'Customer berhasil dihapus' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting customer:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}