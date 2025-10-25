import { prisma } from '@/lib/prisma'
import baileysService from '../services/baileys.service'
import { BlastTarget, BlastTargetResult } from '@/modules/wa/types'

type DeviceStatus = 'connected' | 'disconnected' | 'connecting'

interface MediaFile {
  buffer: Buffer
  fileName: string
  mimetype: string
}

export class WhatsAppRepository {
  private mapStatus(status?: string | null): DeviceStatus {
    if (status === 'CONNECTED') return 'connected'
    if (status === 'CONNECTING') return 'connecting'
    return 'disconnected'
  }

  async getStatus(whatsappNumber: string) {
    const outlet = await prisma.outlet.findFirst({ where: { whatsappNumber } })
    if (!outlet) throw new Error('Outlet not found')
    // Use force check to get real-time status from socket
    const status = await baileysService.forceCheckConnection(outlet.id)
    return {
      status: this.mapStatus(status.status),
      qrCode: status.qrCode,
      name: status.name ?? null,
      deviceInfo: status.deviceInfo ?? null
    }
  }

  async getQRCode(whatsappNumber: string) {
    const outlet = await prisma.outlet.findFirst({ where: { whatsappNumber } })
    if (!outlet) throw new Error('Outlet not found')
    const st = await baileysService.startAndGetQR(outlet.id)
    return st.qrCode as string | null
  }

  async reset(whatsappNumber: string) {
    const outlet = await prisma.outlet.findFirst({ where: { whatsappNumber } })
    if (!outlet) throw new Error('Outlet not found')
    await baileysService.resetSession(outlet.id)
  }

  async checkDeviceStatus(whatsappNumber: string): Promise<DeviceStatus> {
    const outlet = await prisma.outlet.findFirst({ where: { whatsappNumber } })
    if (!outlet) throw new Error('Outlet not found')
    const status = await baileysService.getSessionStatus(outlet.id, { live: true })
    return this.mapStatus(status.status)
  }

  async sendMessage(to: string, message: string, fromOutletId: string) {
    try {
      await baileysService.sendMessage(fromOutletId, to, message)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async sendBulkMessages(
    targets: BlastTarget[],
    message: string,
    mediaFiles?: MediaFile[],
    sendMode: 'separate' | 'caption' = 'separate'
  ): Promise<BlastTargetResult[]> {
    console.log(`[BlastRepository] Starting bulk message send to ${targets.length} targets`)
    console.log(`[BlastRepository] Message length: ${message.length}, preview: ${message.substring(0, 50)}...`)
    console.log(`[BlastRepository] Send mode: ${sendMode}`)
    if (mediaFiles && mediaFiles.length > 0) {
      console.log(`[BlastRepository] Media files: ${mediaFiles.length} files attached`)
      console.log(`[BlastRepository] File types: ${mediaFiles.map(f => f.mimetype).join(', ')}`)
    }

    const results: BlastTargetResult[] = []

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]
      try {
        console.log(`[BlastRepository] [${i + 1}/${targets.length}] Sending to ${t.customerName} (${t.whatsappNumber}) from outlet ${t.outletId}`)

        // Send message with media if available
        if (mediaFiles && mediaFiles.length > 0) {
          const imageFiles = mediaFiles.filter(f => f.mimetype.startsWith('image/'))
          const documentFiles = mediaFiles.filter(f => !f.mimetype.startsWith('image/'))

          if (sendMode === 'caption' && (imageFiles.length > 0 || documentFiles.length > 0)) {
            // CAPTION MODE: Send media with text as caption
            console.log(`[BlastRepository] Sending in CAPTION mode (${imageFiles.length} images, ${documentFiles.length} documents)`)

            // Extra delay before first media when using caption mode
            // This helps when multiple devices are connected
            await new Promise(r => setTimeout(r, 1000))

            // Send first image with caption (if images exist)
            if (imageFiles.length > 0) {
              console.log(`[BlastRepository] Sending first image WITH caption`)
              await baileysService.sendImageMessage(
                t.outletId,
                t.whatsappNumber,
                imageFiles[0].buffer,
                message, // Use message as caption
                0,
                2
              )

              // Wait between files to avoid connection issues
              if (imageFiles.length > 1 || documentFiles.length > 0) {
                await new Promise(r => setTimeout(r, 1200))
              }
            }

            // Send remaining images without caption
            for (let j = 1; j < imageFiles.length; j++) {
              await baileysService.sendImageMessage(
                t.outletId,
                t.whatsappNumber,
                imageFiles[j].buffer,
                '', // No caption for subsequent images
                0,
                2
              )

              // Wait between files
              if (j < imageFiles.length - 1 || documentFiles.length > 0) {
                await new Promise(r => setTimeout(r, 800))
              }
            }

            // Send documents with caption support
            for (let k = 0; k < documentFiles.length; k++) {
              const doc = documentFiles[k]
              // If no images, first document gets the caption
              const docCaption = (imageFiles.length === 0 && k === 0) ? message : ''

              if (docCaption) {
                console.log(`[BlastRepository] Sending document ${doc.fileName} WITH caption`)
              } else {
                console.log(`[BlastRepository] Sending document ${doc.fileName} without caption`)
              }

              await baileysService.sendDocumentMessage(
                t.outletId,
                t.whatsappNumber,
                doc.buffer,
                doc.fileName,
                doc.mimetype,
                docCaption,
                0,
                2
              )

              // Wait between documents
              if (k < documentFiles.length - 1) {
                await new Promise(r => setTimeout(r, 1200))
              }
            }
          } else {
            // SEPARATE MODE: Send text first, then all media
            console.log(`[BlastRepository] Sending in SEPARATE mode`)

            // Send text message first if provided
            if (message && message.trim()) {
              await baileysService.sendMessage(t.outletId, t.whatsappNumber, message)

              // Wait before sending media
              if (imageFiles.length > 0 || documentFiles.length > 0) {
                await new Promise(r => setTimeout(r, 1000))
              }
            }

            // Send all images
            for (const img of imageFiles) {
              await baileysService.sendImageMessage(
                t.outletId,
                t.whatsappNumber,
                img.buffer,
                '',
                0,
                2
              )

              // Wait between images
              if (imageFiles.indexOf(img) < imageFiles.length - 1 || documentFiles.length > 0) {
                await new Promise(r => setTimeout(r, 800))
              }
            }

            // Send all documents
            for (const doc of documentFiles) {
              await baileysService.sendDocumentMessage(
                t.outletId,
                t.whatsappNumber,
                doc.buffer,
                doc.fileName,
                doc.mimetype,
                '',
                0,
                2
              )

              // Wait between documents
              if (documentFiles.indexOf(doc) < documentFiles.length - 1) {
                await new Promise(r => setTimeout(r, 800))
              }
            }
          }
        } else {
          // No media, just send text
          await baileysService.sendMessage(t.outletId, t.whatsappNumber, message)
        }

        console.log(`[BlastRepository] ✅ Success: ${t.customerName} (${t.whatsappNumber})`)
        results.push({
          customerId: t.customerId,
          customerName: t.customerName,
          whatsappNumber: t.whatsappNumber,
          success: true,
          message: 'sent',
          timestamp: new Date(),
        })
      } catch (err: any) {
        console.error(`[BlastRepository] ❌ Failed: ${t.customerName} (${t.whatsappNumber}) - ${err.message}`)
        results.push({
          customerId: t.customerId,
          customerName: t.customerName,
          whatsappNumber: t.whatsappNumber,
          success: false,
          message: err.message || 'failed',
          timestamp: new Date(),
        })
      }

      // Anti-spam: Randomized delay between messages to appear more human-like
      // This helps avoid WhatsApp spam detection and potential bans
      const baseDelay = mediaFiles && mediaFiles.length > 0 ? 3000 : 1500
      const randomVariation = Math.floor(Math.random() * 2000) // 0-2000ms random variation
      const delay = baseDelay + randomVariation // Total: 1.5-3.5s (text) or 3-5s (media)
      
      console.log(`[BlastRepository] Waiting ${delay}ms before next message (anti-spam randomization)...`)
      await new Promise((r) => setTimeout(r, delay))
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    console.log(`[BlastRepository] Bulk send completed: ${successCount} success, ${failureCount} failed out of ${targets.length} total`)

    return results
  }
}

export default new WhatsAppRepository()