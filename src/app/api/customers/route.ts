import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/customers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause based on user role
    let whereClause: any = {}

    if (session.user.role === 'USER') {
      // USER can only see customers from their outlet
      if (!session.user.outletId) {
        return NextResponse.json(
          { error: 'User not assigned to any outlet' },
          { status: 400 }
        )
      }
      whereClause.outletId = session.user.outletId
    }
    // ADMIN and SUPERADMIN can see all customers

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { noWa: { contains: search, mode: 'insensitive' } },
        { 
          outlet: { 
            namaOutlet: { contains: search, mode: 'insensitive' } 
          } 
        }
      ]
    }

    // Fetch customers with pagination
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        include: {
          outlet: {
            select: {
              id: true,
              namaOutlet: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.customer.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST /api/customers
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.nama || !body.noWa || !body.outletId) {
      return NextResponse.json(
        { error: 'Nama, nomor WhatsApp, dan outlet wajib diisi' },
        { status: 400 }
      )
    }

    // Validate WhatsApp number format (simple validation)
    const waNumber = body.noWa.replace(/\D/g, '') // Remove non-digits
    if (waNumber.length < 10 || waNumber.length > 15) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp tidak valid' },
        { status: 400 }
      )
    }

    // Check authorization for outlet access
    if (session.user.role === 'USER') {
      if (session.user.outletId !== body.outletId) {
        return NextResponse.json(
          { error: 'Anda hanya dapat menambah customer ke outlet Anda sendiri' },
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

    // Check if WhatsApp number already exists in the same outlet
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        noWa: waNumber,
        outletId: body.outletId
      }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp sudah terdaftar di outlet ini' },
        { status: 409 }
      )
    }

    // Create customer
    const customer = await prisma.customer.create({
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

    console.log('Customer created:', customer.nama, 'for outlet:', outlet.namaOutlet)

    return NextResponse.json(customer, { status: 201 })

  } catch (error) {
    console.error('Error creating customer:', error)
    
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