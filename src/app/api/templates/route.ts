import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch templates for outlet
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
    const outletId = searchParams.get('outletId')
    const category = searchParams.get('category')

    // Build query filter
    const where: any = {
      isActive: true,
    }

    if (outletId) {
      where.outletId = outletId
    }

    if (category) {
      where.category = category
    }

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        description: true,
        variables: true,
        usageCount: true,
        outletId: true,
      },
    })

    // Get unique categories
    const categories = await prisma.messageTemplate.findMany({
      where: { isActive: true },
      distinct: ['category'],
      select: { category: true },
    })

    return NextResponse.json({
      templates,
      categories: categories
        .map((c: any) => c.category)
        .filter((c: any) => c !== null),
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST: Create new template
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
    const { outletId, name, content, category, description, variables } = body

    // Validation
    if (!outletId || !name || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: outletId, name, content' },
        { status: 400 }
      )
    }

    if (content.length > 4000) {
      return NextResponse.json(
        { error: 'Content exceeds maximum length of 4000 characters' },
        { status: 400 }
      )
    }

    // Check if user has access to this outlet
    const user = await prisma.user.findMany({
      where: { 
        id: session.user.id as string,
      },
      include: { outlet: true },
    })

    if (!user || user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const currentUser = user[0]

    // Validate access
    if (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ADMIN') {
      if (currentUser.outletId !== outletId) {
        return NextResponse.json(
          { error: 'Access denied to this outlet' },
          { status: 403 }
        )
      }
    }

    // Create template
    const template = await prisma.messageTemplate.create({
      data: {
        outletId,
        name,
        content,
        category: category || null,
        description: description || null,
        variables: variables ? JSON.stringify(variables) : '[]',
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
