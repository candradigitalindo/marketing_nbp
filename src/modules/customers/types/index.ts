export interface CreateCustomerData {
  nama: string
  noWa: string
  email?: string
  outletId: string
}

export interface UpdateCustomerData {
  nama?: string
  noWa?: string
  email?: string
}

export interface CustomerWithOutlet {
  id: string
  nama: string
  noWa: string
  email: string | null
  outletId: string
  createdAt: Date
  updatedAt: Date
  outlet: {
    id: string
    namaOutlet: string
    whatsappNumber: string
  }
}

export interface CustomerFilters {
  outletId?: string
  search?: string
  limit?: number
  offset?: number
}