import { prisma } from '@/lib/prisma'
import { CreateCustomerData, UpdateCustomerData, CustomerFilters } from '../types'

export class CustomerRepository {
  async findAll(filters: CustomerFilters = {}) {
    const { outletId, search, limit = 50, offset = 0 } = filters

    const where: any = {}

    if (outletId) {
      where.outletId = outletId
    }

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { noWa: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    return await prisma.customer.findMany({
      where,
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })
  }

  async findById(id: string) {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
            alamat: true,
            whatsappNumber: true,
          },
        },
      },
    })
  }

  async create(data: CreateCustomerData) {
    return await prisma.customer.create({
      data,
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
            whatsappNumber: true,
          },
        },
      },
    })
  }

  async update(id: string, data: UpdateCustomerData) {
    return await prisma.customer.update({
      where: { id },
      data,
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
            whatsappNumber: true,
          },
        },
      },
    })
  }

  async delete(id: string) {
    return await prisma.customer.delete({
      where: { id },
    })
  }

  async findByWhatsappNumber(noWa: string, outletId: string) {
    return await prisma.customer.findFirst({
      where: { 
        noWa,
        outletId,
      },
    })
  }

  async existsById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    })
    return !!customer
  }

  async count(filters: CustomerFilters = {}) {
    const { outletId, search } = filters

    const where: any = {}

    if (outletId) {
      where.outletId = outletId
    }

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { noWa: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    return await prisma.customer.count({ where })
  }

  async findByOutletIds(outletIds: string[]) {
    return await prisma.customer.findMany({
      where: {
        outletId: {
          in: outletIds,
        },
      },
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findByIds(customerIds: string[], outletId?: string) {
    const where: any = {
      id: {
        in: customerIds,
      },
    }

    // If outletId provided, filter by outlet (for USER role)
    if (outletId) {
      where.outletId = outletId
    }

    return await prisma.customer.findMany({
      where,
      include: {
        outlet: {
          select: {
            id: true,
            namaOutlet: true,
            whatsappNumber: true,
          },
        },
      },
    })
  }

  async validateCustomerAccess(customerIds: string[], outletId: string): Promise<boolean> {
    // Check if all customers belong to the specified outlet
    const count = await prisma.customer.count({
      where: {
        id: { in: customerIds },
        outletId: outletId,
      },
    })

    return count === customerIds.length
  }
}