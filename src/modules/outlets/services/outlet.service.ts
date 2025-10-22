import { OutletRepository } from '../repositories/outlet.repository'
import { CreateOutletData, UpdateOutletData } from '../types'
import { validateWhatsAppNumber } from '@/lib/utils'

export class OutletService {
  private outletRepository: OutletRepository

  constructor() {
    this.outletRepository = new OutletRepository()
  }

  async getAllOutlets() {
    return await this.outletRepository.findAll()
  }

  async getOutletById(id: string) {
    const outlet = await this.outletRepository.findById(id)
    if (!outlet) {
      throw new Error('Outlet not found')
    }
    return outlet
  }

  async createOutlet(data: CreateOutletData) {
    // Validate WhatsApp number
    if (!validateWhatsAppNumber(data.whatsappNumber)) {
      throw new Error('Invalid WhatsApp number format')
    }

    // Check if WhatsApp number already exists
    const existingOutlet = await this.outletRepository.findByWhatsappNumber(data.whatsappNumber)
    if (existingOutlet) {
      throw new Error('WhatsApp number already registered to another outlet')
    }

    return await this.outletRepository.create(data)
  }

  async updateOutlet(id: string, data: UpdateOutletData) {
    // Check if outlet exists
    const exists = await this.outletRepository.existsById(id)
    if (!exists) {
      throw new Error('Outlet not found')
    }

    // Validate WhatsApp number if provided
    if (data.whatsappNumber) {
      if (!validateWhatsAppNumber(data.whatsappNumber)) {
        throw new Error('Invalid WhatsApp number format')
      }

      // Check if WhatsApp number already exists for different outlet
      const existingOutlet = await this.outletRepository.findByWhatsappNumber(data.whatsappNumber)
      if (existingOutlet && existingOutlet.id !== id) {
        throw new Error('WhatsApp number already registered to another outlet')
      }
    }

    return await this.outletRepository.update(id, data)
  }

  async deleteOutlet(id: string) {
    // Check if outlet exists
    const exists = await this.outletRepository.existsById(id)
    if (!exists) {
      throw new Error('Outlet not found')
    }

    return await this.outletRepository.delete(id)
  }
}