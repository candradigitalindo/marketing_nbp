import { prisma } from '@/lib/prisma'
import { CreateOutletData, UpdateOutletData } from '../types'

export class OutletRepository {
  async findAll() {
    return await prisma.outlet.findMany({
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findById(id: string) {
    return await prisma.outlet.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            customers: true,
          },
        },
      },
    })
  }

  async create(data: CreateOutletData) {
    return await prisma.outlet.create({
      data,
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
          },
        },
      },
    })
  }

  async update(id: string, data: UpdateOutletData) {
    return await prisma.outlet.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
          },
        },
      },
    })
  }

  async delete(id: string) {
    return await prisma.outlet.delete({
      where: { id },
    })
  }

  async findByWhatsappNumber(whatsappNumber: string) {
    return await prisma.outlet.findFirst({
      where: { whatsappNumber },
    })
  }

  async existsById(id: string) {
    const outlet = await prisma.outlet.findUnique({
      where: { id },
      select: { id: true },
    })
    return !!outlet
  }
}