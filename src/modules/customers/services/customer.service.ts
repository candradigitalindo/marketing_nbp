import { CustomerRepository } from '../repositories/customer.repository'
import { OutletRepository } from '../../outlets/repositories/outlet.repository'
import { CreateCustomerData, UpdateCustomerData, CustomerFilters } from '../types'
import { formatPhoneNumber, validateWhatsAppNumber } from '@/lib/utils'

export class CustomerService {
  private customerRepository: CustomerRepository
  private outletRepository: OutletRepository

  constructor() {
    this.customerRepository = new CustomerRepository()
    this.outletRepository = new OutletRepository()
  }

  async getAllCustomers(filters: CustomerFilters = {}, userRole: string, userOutletId?: string | null) {
    // Apply role-based filtering
    if (userRole === 'USER' && userOutletId) {
      filters.outletId = userOutletId
    }

    const customers = await this.customerRepository.findAll(filters)
    const total = await this.customerRepository.count(filters)

    return {
      customers,
      total,
      hasMore: (filters.offset || 0) + customers.length < total,
    }
  }

  async getCustomerById(id: string, userRole: string, userOutletId?: string | null) {
    const customer = await this.customerRepository.findById(id)
    if (!customer) {
      throw new Error('Customer not found')
    }

    // Role-based access control
    if (userRole === 'USER' && customer.outletId !== userOutletId) {
      throw new Error('Access denied - You can only view customers from your outlet')
    }

    return customer
  }

  async createCustomer(data: CreateCustomerData, userRole: string, userOutletId?: string | null) {
    // Validate outlet exists
    const outletExists = await this.outletRepository.existsById(data.outletId)
    if (!outletExists) {
      throw new Error('Outlet not found')
    }

    // Role-based access control for outlet selection
    if (userRole === 'USER' && data.outletId !== userOutletId) {
      throw new Error('Access denied - You can only create customers for your outlet')
    }

    // Format and validate WhatsApp number
    const formattedWa = formatPhoneNumber(data.noWa)
    if (!validateWhatsAppNumber(formattedWa)) {
      throw new Error('Invalid WhatsApp number format')
    }

    // Check if WhatsApp number already exists in the same outlet
    const existingCustomer = await this.customerRepository.findByWhatsappNumber(formattedWa, data.outletId)
    if (existingCustomer) {
      throw new Error('WhatsApp number already registered in this outlet')
    }

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format')
      }
    }

    return await this.customerRepository.create({
      ...data,
      noWa: formattedWa,
    })
  }

  async updateCustomer(id: string, data: UpdateCustomerData, userRole: string, userOutletId?: string | null) {
    // Check if customer exists and get current data
    const existingCustomer = await this.customerRepository.findById(id)
    if (!existingCustomer) {
      throw new Error('Customer not found')
    }

    // Role-based access control
    if (userRole === 'USER' && existingCustomer.outletId !== userOutletId) {
      throw new Error('Access denied - You can only update customers from your outlet')
    }

    // Format and validate WhatsApp number if provided
    if (data.noWa) {
      const formattedWa = formatPhoneNumber(data.noWa)
      if (!validateWhatsAppNumber(formattedWa)) {
        throw new Error('Invalid WhatsApp number format')
      }

      // Check if WhatsApp number already exists in the same outlet (excluding current customer)
      const existingWithWa = await this.customerRepository.findByWhatsappNumber(formattedWa, existingCustomer.outletId)
      if (existingWithWa && existingWithWa.id !== id) {
        throw new Error('WhatsApp number already registered in this outlet')
      }

      data.noWa = formattedWa
    }

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format')
      }
    }

    return await this.customerRepository.update(id, data)
  }

  async deleteCustomer(id: string, userRole: string, userOutletId?: string | null) {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id)
    if (!existingCustomer) {
      throw new Error('Customer not found')
    }

    // Role-based access control
    if (userRole === 'USER' && existingCustomer.outletId !== userOutletId) {
      throw new Error('Access denied - You can only delete customers from your outlet')
    }

    return await this.customerRepository.delete(id)
  }

  async getCustomersForBlast(userRole: string, userOutletId?: string | null, outletIds?: string[], customerIds?: string[]) {
    console.log(`[CustomerService] getCustomersForBlast - role: ${userRole}, userOutletId: ${userOutletId}, outletIds: ${outletIds?.join(',')}, customerIds: ${customerIds?.length || 0}`)
    
    // If specific customerIds are provided
    if (customerIds && customerIds.length > 0) {
      console.log(`[CustomerService] Fetching specific ${customerIds.length} customers`)
      
      // For USER role, validate that all customers belong to their outlet
      if (userRole === 'USER' && userOutletId) {
        const hasAccess = await this.customerRepository.validateCustomerAccess(customerIds, userOutletId)
        if (!hasAccess) {
          console.error(`[CustomerService] USER tried to access customers outside their outlet`)
          throw new Error('Access denied: You can only send to customers from your outlet')
        }
        return await this.customerRepository.findByIds(customerIds, userOutletId)
      }
      
      // ADMIN and SUPERADMIN can access any customers
      return await this.customerRepository.findByIds(customerIds)
    }

    if (userRole === 'SUPERADMIN') {
      // SUPERADMIN can access all customers
      if (outletIds && outletIds.length > 0) {
        console.log(`[CustomerService] SUPERADMIN fetching customers from ${outletIds.length} outlets`)
        return await this.customerRepository.findByOutletIds(outletIds)
      }
      console.log(`[CustomerService] SUPERADMIN fetching all customers`)
      return await this.customerRepository.findAll()
    }

    if (userRole === 'ADMIN') {
      // ADMIN can access all customers or filter by outlets
      if (outletIds && outletIds.length > 0) {
        console.log(`[CustomerService] ADMIN fetching customers from ${outletIds.length} outlets`)
        return await this.customerRepository.findByOutletIds(outletIds)
      }
      console.log(`[CustomerService] ADMIN fetching all customers`)
      return await this.customerRepository.findAll()
    }

    if (userRole === 'USER' && userOutletId) {
      // USER can only access customers from their outlet
      console.log(`[CustomerService] USER fetching customers from their outlet ${userOutletId}`)
      return await this.customerRepository.findAll({ outletId: userOutletId })
    }

    console.error(`[CustomerService] Access denied for role: ${userRole}`)
    throw new Error('Access denied')
  }
}