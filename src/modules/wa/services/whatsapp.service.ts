import { CustomerService } from '../../customers/services/customer.service'
import { OutletRepository } from '../../outlets/repositories/outlet.repository'
import { WhatsAppRepository } from '../repositories/whatsapp.repository'
import { BlastRequest, BlastResult, BlastTarget, QRScanResult } from '../types'

export class WhatsAppService {
  private customerService: CustomerService
  private outletRepository: OutletRepository
  private whatsappRepository: WhatsAppRepository

  constructor() {
    this.customerService = new CustomerService()
    this.outletRepository = new OutletRepository()
    this.whatsappRepository = new WhatsAppRepository()
  }

  async sendBlast(
    request: BlastRequest,
    userRole: string,
    userOutletId?: string | null
  ): Promise<BlastResult> {
    try {
      // Get target customers based on role and filters
      const customers = await this.getBlastTargets(request, userRole, userOutletId)
      
      if (customers.length === 0) {
        return {
          success: false,
          message: 'No customers found for blast',
          totalTargets: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        }
      }

      // Prepare blast targets
      const targets: BlastTarget[] = customers.map((customer: any) => ({
        customerId: customer.id,
        customerName: customer.nama,
        whatsappNumber: customer.noWa,
        outletId: customer.outlet.id,
        outletName: customer.outlet.namaOutlet,
        senderWhatsappNumber: customer.outlet.whatsappNumber,
      }))

      // Send messages
      const results = await this.whatsappRepository.sendBulkMessages(targets, request.message)
      
      const sentCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length

      return {
        success: sentCount > 0,
        message: `Blast completed: ${sentCount} sent, ${failedCount} failed`,
        totalTargets: targets.length,
        sentCount,
        failedCount,
        results,
      }
    } catch (error) {
      console.error('Error in WhatsApp blast:', error)
      throw error
    }
  }

  async getBlastPreview(
    request: BlastRequest,
    userRole: string,
    userOutletId?: string | null
  ) {
    const customers = await this.getBlastTargets(request, userRole, userOutletId)
    
    return {
      totalTargets: customers.length,
      outlets: this.groupCustomersByOutlet(customers),
      message: request.message,
    }
  }

  private async getBlastTargets(
    request: BlastRequest,
    userRole: string,
    userOutletId?: string | null
  ) {
    if (request.customerIds && request.customerIds.length > 0) {
      // Specific customers selected
      // For now, we'll need to implement individual customer access check
      // This would require updates to customer service
      return []
    }

    // Get customers based on role and outlet filters
    return await this.customerService.getCustomersForBlast(
      userRole,
      userOutletId,
      request.outletIds
    )
  }

  private groupCustomersByOutlet(customers: any[]) {
    const grouped = customers.reduce((acc, customer) => {
      const outletId = customer.outlet.id
      if (!acc[outletId]) {
        acc[outletId] = {
          outletId,
          outletName: customer.outlet.namaOutlet,
          whatsappNumber: customer.outlet.whatsappNumber,
          customers: [],
        }
      }
      acc[outletId].customers.push({
        id: customer.id,
        nama: customer.nama,
        noWa: customer.noWa,
      })
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped)
  }

  async getQRCode(whatsappNumber: string): Promise<QRScanResult> {
    const qrCode = await this.whatsappRepository.getQRCode(whatsappNumber)
    const deviceStatus = await this.whatsappRepository.checkDeviceStatus(whatsappNumber)

    return {
      qrCode,
      whatsappNumber,
      deviceStatus,
      lastSeen: new Date(),
    }
  }

  async checkDeviceStatus(whatsappNumber: string) {
    return await this.whatsappRepository.checkDeviceStatus(whatsappNumber)
  }

  async validateMessage(message: string): Promise<boolean> {
    // Basic message validation
    if (!message || message.trim().length === 0) {
      return false
    }

    // Check message length (WhatsApp limit is around 4096 characters)
    if (message.length > 4000) {
      return false
    }

    return true
  }

  async getOutletWhatsAppNumbers(userRole: string, userOutletId?: string | null) {
    if (userRole === 'USER' && userOutletId) {
      const outlet = await this.outletRepository.findById(userOutletId)
      return outlet ? [{ id: outlet.id, namaOutlet: outlet.namaOutlet, whatsappNumber: outlet.whatsappNumber }] : []
    }

    const outlets = await this.outletRepository.findAll()
    return outlets.map((outlet: any) => ({
      id: outlet.id,
      namaOutlet: outlet.namaOutlet,
      whatsappNumber: outlet.whatsappNumber,
    }))
  }
}