export interface CreateOutletData {
  namaOutlet: string
  alamat: string
  telepon: string
  whatsappNumber: string
}

export interface UpdateOutletData {
  namaOutlet?: string
  alamat?: string
  telepon?: string
  whatsappNumber?: string
}

export interface OutletWithCounts {
  id: string
  namaOutlet: string
  alamat: string
  telepon: string
  whatsappNumber: string
  createdAt: Date
  updatedAt: Date
  _count: {
    users: number
    customers: number
  }
}