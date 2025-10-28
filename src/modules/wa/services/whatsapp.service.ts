import { CustomerService } from '../../customers/services/customer.service'
import { OutletRepository } from '../../outlets/repositories/outlet.repository'
import { WhatsAppRepository } from '../repositories/whatsapp.repository'
import { BlastRequest, BlastResult, BlastTarget, QRScanResult } from '../types'

interface MediaFile {
  buffer: Buffer
  fileName: string
  mimetype: string
}

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
    userOutletId?: string | null,
    mediaFiles?: MediaFile[],
    sendMode: 'separate' | 'caption' = 'separate'
  ): Promise<BlastResult> {
    try {
      console.log(`[BlastService] Starting blast from user role: ${userRole}, outletId: ${userOutletId}`)
      console.log(`[BlastService] Request - outletIds: ${request.outletIds?.join(',')} | customerIds: ${request.customerIds?.join(',')}`)
      console.log(`[BlastService] Message preview: ${request.message.substring(0, 100)}...`)
      console.log(`[BlastService] Send mode: ${sendMode}, Media files: ${mediaFiles?.length || 0}`)
      
      // Get target customers based on role and filters
      const customers = await this.getBlastTargets(request, userRole, userOutletId)
      console.log(`[BlastService] Found ${customers.length} target customers`)
      
      if (customers.length === 0) {
        console.warn(`[BlastService] No customers found for blast`)
        return {
          success: false,
          message: 'No customers found for blast',
          totalTargets: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        }
      }

      // Log customer details
      const groupedByOutlet = this.groupCustomersByOutlet(customers)
      console.log(`[BlastService] Customers grouped into ${Object.keys(groupedByOutlet).length} outlets:`)
      Object.values(groupedByOutlet).forEach((outlet: any) => {
        console.log(`  - ${outlet.outletName}: ${outlet.customers.length} customers`)
      })

      // Prepare blast targets
      const targets: BlastTarget[] = customers.map((customer: any) => ({
        customerId: customer.id,
        customerName: customer.nama,
        whatsappNumber: customer.noWa,
        outletId: customer.outlet.id,
        outletName: customer.outlet.namaOutlet,
        senderWhatsappNumber: customer.outlet.whatsappNumber,
      }))

      console.log(`[BlastService] Starting to send ${targets.length} messages`)

      // Send messages (with media if provided)
      const results = await this.whatsappRepository.sendBulkMessages(
        targets, 
        request.message,
        mediaFiles,
        sendMode
      )
      
      const sentCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length

      console.log(`[BlastService] Blast completed - Sent: ${sentCount}, Failed: ${failedCount}, Total: ${targets.length}`)

      return {
        success: sentCount > 0,
        message: `Blast completed: ${sentCount} sent, ${failedCount} failed`,
        totalTargets: targets.length,
        sentCount,
        failedCount,
        results,
      }
    } catch (error) {
      console.error('[BlastService] Error in WhatsApp blast:', error)
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
    console.log('🔍 getBlastTargets - customerIds:', request.customerIds?.length || 0)
    console.log('🔍 getBlastTargets - outletIds:', request.outletIds)
    console.log('🔍 getBlastTargets - userRole:', userRole)
    console.log('🔍 getBlastTargets - userOutletId:', userOutletId)
    console.log('🔍 getBlastTargets - excludeCustomerIds:', request.excludeCustomerIds?.length || 0)

    // Get customers based on role and outlet filters
    const targets = await this.customerService.getCustomersForBlast(
      userRole,
      userOutletId,
      request.outletIds,
      request.customerIds // Pass customerIds for validation
    )

    // Filter out excluded customers if provided
    let filteredTargets = targets
    if (request.excludeCustomerIds && request.excludeCustomerIds.length > 0) {
      filteredTargets = targets.filter(
        t => !request.excludeCustomerIds!.includes(t.id)
      )
      console.log(`🔍 getBlastTargets - filtered: ${targets.length} → ${filteredTargets.length} (excluded ${targets.length - filteredTargets.length})`)
    }

    console.log('🔍 getBlastTargets - found customers:', filteredTargets.length)
    return filteredTargets
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