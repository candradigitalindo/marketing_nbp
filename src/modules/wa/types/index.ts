export interface BlastRequest {
  message: string
  outletIds?: string[]
  customerIds?: string[]
}

export interface BlastTarget {
  customerId: string
  customerName: string
  whatsappNumber: string
  outletId: string
  outletName: string
  senderWhatsappNumber: string
}

export interface BlastResult {
  success: boolean
  message: string
  totalTargets: number
  sentCount: number
  failedCount: number
  results: BlastTargetResult[]
}

export interface BlastTargetResult {
  customerId: string
  customerName: string
  whatsappNumber: string
  success: boolean
  message: string
  timestamp: Date
}

export interface QRScanResult {
  qrCode: string
  whatsappNumber: string
  deviceStatus: 'connected' | 'disconnected' | 'scanning'
  lastSeen?: Date
}