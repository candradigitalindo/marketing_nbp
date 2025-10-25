import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  AnyMessageContent,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import { generateULID } from '@/lib/utils'

type OutletId = string

// Constants for timeouts and retry configuration
const TIMEOUTS = {
  SOCKET_WAIT: 1000,
  DB_SYNC: 500,
  RETRY_DELAY: 2000,
  AUTO_RECONNECT: 3000,
  RECONNECT_COOLDOWN: 30000, // 30 seconds between reconnect attempts
  CONFLICT_COOLDOWN: 60000, // 60 seconds for conflict errors (440)
  PHONE_CHECK: 12_000,
  PHONE_CHECK_INIT: 800,
  PHONE_CHECK_INIT_LONG: 1500,
  PHONE_CHECK_WAIT: 1000,
} as const

const RETRY_CONFIG = {
  MAX_RETRIES: 2,
  MAX_PHONE_CHECK_ATTEMPTS: 15,
  MAX_QR_ATTEMPTS: 33,
  MAX_RECONNECT_ATTEMPTS: 3, // Max consecutive reconnect attempts before stopping
} as const

function toJid(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCc = digits.startsWith('62') ? digits : digits.startsWith('0') ? `62${digits.slice(1)}` : `62${digits}`
  return `${withCc}@s.whatsapp.net`
}

class BaileysService {
  private static instance: BaileysService
  private sockets: Map<OutletId, WASocket> = new Map()
  private initializing: Map<OutletId, Promise<void>> = new Map()
  private reconnectCooldowns: Map<OutletId, number> = new Map() // Track last reconnect attempt
  private isConnecting: Map<OutletId, boolean> = new Map() // Prevent duplicate connections
  private phoneMismatchBlocked: Map<OutletId, boolean> = new Map() // Block reconnect after phone mismatch

  private constructor() {}

  private normalizeQr(value: string): string {
    return value.replace(/\s+/g, '')
  }

  // Validate WhatsApp number format (Indonesian numbers)
  private isValidPhoneFormat(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/\D/g, '')

    // Must be 10-15 digits (standard international range)
    if (digits.length < 10 || digits.length > 15) {
      return false
    }

    // Indonesian numbers can be in two formats:
    // 1. Local format with leading 0: starts with 08 (e.g., 08xxx) - 10-14 digits
    // 2. Local format without leading 0: starts with 8 (e.g., 8xxx) - 9-13 digits (but we need 10+ so 10-13)
    // 3. International format: starts with 62 (e.g., 62xxx) - 11-15 digits

    const startsWithZeroEight = digits.startsWith('08')
    const startsWithEight = digits.startsWith('8') && !startsWithZeroEight // 8 but not 08
    const startsWith62 = digits.startsWith('62')

    if (startsWithZeroEight) {
      // Local format with leading 0: 10-14 digits
      if (digits.length < 10 || digits.length > 14) {
        return false
      }
    } else if (startsWithEight) {
      // Local format without leading 0: 10-13 digits (since we need 10+ total digits and it starts with 8)
      if (digits.length < 10 || digits.length > 13) {
        return false
      }
    } else if (startsWith62) {
      // International format: 11-15 digits
      if (digits.length < 11 || digits.length > 15) {
        return false
      }
    } else {
      // Must start with either 08, 8, or 62
      return false
    }

    // Additional check: no all same digit (e.g., 08888888888, 11111111111)
    // Pattern: 8 or more consecutive same digits anywhere in the number
    if (/(.)\1{7,}/.test(digits)) {
      return false
    }

    return true
  }

  static getInstance() {
    if (!BaileysService.instance) {
      BaileysService.instance = new BaileysService()
    }
    return BaileysService.instance
  }

  // Helper: Extract device and session info from socket user
  private getDeviceInfo(user: any) {
    return {
      sessionName: user?.name || user?.pushname || undefined,
      deviceInfo: {
        id: user?.id,
        name: user?.name,
        pushname: user?.pushname,
        platform: 'WEB',
      },
    }
  }

  // Initialize known sessions from DB and sync status
  async init() {
    console.log('[Baileys] Initializing service and syncing sessions...')
    const db = prisma as any
    const sessions = await db.whatsappSession?.findMany?.() || []

    for (const s of sessions) {
      // Lazy reconnect for autoReconnect sessions
      if (s.autoReconnect) {
        this.ensureSession(s.outletId).catch(() => void 0)
      }
    }

    // Wait a moment for sockets to initialize
    await new Promise(r => setTimeout(r, 2000))

    // Sync all session statuses
    console.log('[Baileys] Syncing session statuses...')
    await this.syncAllSessionStatuses()
  }

  // Sync all session statuses between DB and in-memory sockets
  private async syncAllSessionStatuses() {
    const db = prisma as any

    // Get all sessions from DB
    const dbSessions = await db.whatsappSession?.findMany?.() || []

    for (const session of dbSessions) {
      try {
        const outletId = session.outletId
        const dbStatus = session.status

        // Check if socket exists and is connected
        const isConnected = await this.verifyLiveConnection(outletId)

        // If DB says DISCONNECTED but socket is connected, update DB
        if (dbStatus !== 'CONNECTED' && isConnected) {
          console.log(`[Baileys] SYNC: ${outletId} is connected but DB says ${dbStatus}, updating...`)

          const sock = this.sockets.get(outletId) as any
          const user = sock?.user || {}
          const { sessionName, deviceInfo } = this.getDeviceInfo(user)

          await db.whatsappSession.update({
            where: { id: session.id },
            data: {
              status: 'CONNECTED',
              qrCode: null,
              connectedAt: new Date(),
              sessionName: sessionName,
              deviceInfo: deviceInfo as any,
              autoReconnect: true, // Enable auto-reconnect
            },
          })

          await prisma.outlet.update({
            where: { id: outletId },
            data: { isWhatsappActive: true },
          })

          console.log(`[Baileys] ✅ ${outletId} synced to CONNECTED`)
        }

        // If DB says CONNECTED but socket is not connected, update DB
        if (dbStatus === 'CONNECTED' && !isConnected) {
          console.log(`[Baileys] SYNC: ${outletId} DB says CONNECTED but socket not active, updating...`)

          await db.whatsappSession.update({
            where: { id: session.id },
            data: {
              status: 'DISCONNECTED',
              qrCode: null,
              lastSeen: new Date(),
            },
          })

          await prisma.outlet.update({
            where: { id: outletId },
            data: { isWhatsappActive: false },
          })

          console.log(`[Baileys] ✅ ${outletId} synced to DISCONNECTED`)
        }
      } catch (err) {
        console.error(`[Baileys] Error syncing session ${session.outletId}:`, err)
      }
    }

    console.log('[Baileys] Session status sync completed')
  }

  private sessionsDirFor(outletId: string) {
    const base = path.join(process.cwd(), 'sessions')
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true })
    return path.join(base, outletId)
  }

  async ensureSession(outletId: string) {
    // Already connected
    if (this.sockets.has(outletId)) return
    
    // Already connecting - wait for it
    if (this.initializing.has(outletId)) return this.initializing.get(outletId)!
    
    // Check if another connection attempt is in progress
    if (this.isConnecting.get(outletId)) {
      console.log(`[Baileys] ensureSession: Already connecting for ${outletId}, skipping duplicate attempt`)
      return
    }

    const initPromise = this.connect(outletId)
    this.initializing.set(outletId, initPromise)
    try {
      await initPromise
    } finally {
      this.initializing.delete(outletId)
    }
  }

  private async connect(outletId: string) {
    // Set connecting flag
    this.isConnecting.set(outletId, true)
    
    // Clear phone mismatch block when user retries (gives them another chance)
    if (this.phoneMismatchBlocked.get(outletId)) {
      console.log(`[Baileys] Clearing phone mismatch block for ${outletId} - user is retrying`)
      this.phoneMismatchBlocked.delete(outletId)
    }
    
    try {
      // Ensure WhatsappSession row exists
      const db = prisma as any
      // fallback: use outlet's phone number if any
      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } })
      const sessId = outletId || generateULID()
      const session = await db.whatsappSession.upsert({
        where: { sessionId: sessId },
        create: {
          outletId,
          phoneNumber: outlet?.whatsappNumber || '',
          sessionId: sessId,
          status: 'CONNECTING',
        },
        update: {
          status: 'CONNECTING',
          phoneNumber: outlet?.whatsappNumber || '',
          deviceInfo: null, // Clear previous error info
        },
      })

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionsDirFor(outletId))
    // Always use the latest supported WA Web version to avoid connection failures
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['NBP Marketing', 'Chrome', '1.0.0'],
      version,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60_000, // Increase timeout to 60 seconds
      qrTimeout: 60_000, // QR code valid for 60 seconds (default is 20s)
      retryRequestDelayMs: 500, // Faster retry for better responsiveness
      // Disable verbose logging but keep critical errors
      logger: {
        level: 'error' as any,
        debug: () => { },
        info: () => { },
        warn: () => { },
        error: (msg: string | object) => {
          // Suppress timeout errors - they're too noisy
          if (typeof msg === 'object' && msg && 'err' in msg) {
            const err = (msg as any).err
            if (err?.output?.payload?.message === 'Timed Out') {
              // Silently ignore timeout errors
              return
            }
          }
          
          const errorMsg = typeof msg === 'string' ? msg : JSON.stringify(msg)
          // Only log conflict errors once
          if (errorMsg.includes('"type":"replaced"')) {
            console.log(`[Baileys] ⚠️ Conflict: Another device connected for outlet ${outletId}`)
            return
          }
          
          console.error(`[Baileys Error] ${errorMsg}`)
        },
        trace: () => { },
        child: () => ({
          debug: () => { },
          info: () => { },
          warn: () => { },
          error: (msg: string | object) => {
            // Same filtering for child logger
            if (typeof msg === 'object' && msg && 'err' in msg) {
              const err = (msg as any).err
              if (err?.output?.payload?.message === 'Timed Out') {
                return
              }
            }
            
            const errorMsg = typeof msg === 'string' ? msg : JSON.stringify(msg)
            if (errorMsg.includes('"type":"replaced"')) {
              return
            }
            
            console.error(`[Baileys Error] ${errorMsg}`)
          },
          trace: () => { },
          level: 'error' as any,
        } as any),
      } as any,
    })

    this.sockets.set(outletId, sock)

    sock.ev.on('connection.update', async (update) => {
      try {
        const { connection, qr, lastDisconnect } = update
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode

        // Only log important connection changes (not 'connecting' or 'none')
        if (connection === 'open' || connection === 'close' || qr) {
          console.log(`[Baileys] Outlet ${outletId} connection update: ${connection || 'none'}, QR: ${!!qr}, Code: ${statusCode || 'none'}`)
        }

        if (qr) {
          const sanitizedQr = this.normalizeQr(qr)
          try {
            await db.whatsappSession.update({
              where: { id: session!.id },
              data: { qrCode: sanitizedQr, status: 'CONNECTING' },
            })
          } catch (err) {
            console.error(`[Connection Update] Failed to save QR for ${outletId}:`, err)
          }
        }

        if (connection === 'open') {
          const user = (sock as any)?.user || {}
          const { sessionName, deviceInfo } = this.getDeviceInfo(user)

          // Extract connected phone number from user.id (format: 628xxx:xx@s.whatsapp.net)
          const connectedPhone = user?.id ? user.id.split(':')[0].split('@')[0] : null
          
          // Get outlet's registered WhatsApp number
          const outlet = await prisma.outlet.findUnique({ where: { id: outletId } })
          const registeredPhone = outlet?.whatsappNumber?.replace(/\D/g, '') // Remove non-digits
          
          // Normalize registered phone (add 62 if starts with 0)
          const normalizedRegistered = registeredPhone?.startsWith('0') 
            ? '62' + registeredPhone.slice(1) 
            : registeredPhone?.startsWith('62') 
            ? registeredPhone 
            : '62' + registeredPhone

          // Check if connected phone matches registered phone
          const phoneMatches = connectedPhone && normalizedRegistered && connectedPhone === normalizedRegistered
          
          if (!phoneMatches && registeredPhone) {
            // Phone number mismatch - disconnect and show error
            console.error(`[Baileys] ⚠️ PHONE MISMATCH for outlet ${outletId}!`)
            console.error(`  Registered: ${normalizedRegistered}`)
            console.error(`  Connected:  ${connectedPhone}`)
            console.error(`  → Disconnecting wrong number...`)
            
            // Mark as blocked to prevent auto-reconnect
            this.phoneMismatchBlocked.set(outletId, true)
            
            // Update session with error status
            try {
              await db.whatsappSession.update({
                where: { id: session!.id },
                data: {
                  status: 'DISCONNECTED',
                  qrCode: null,
                  lastSeen: new Date(),
                  sessionName: `WRONG NUMBER: ${connectedPhone}`,
                  deviceInfo: {
                    error: 'Phone number mismatch',
                    registered: normalizedRegistered,
                    connected: connectedPhone,
                  } as any,
                  autoReconnect: false, // Disable auto-reconnect after mismatch
                },
              })
            } catch (err) {
              console.error(`[Connection Update] Failed to save mismatch error:`, err)
            }
            
            // Disconnect the socket
            try {
              await (sock as any).logout?.()
            } catch (err) {
              console.error(`[Connection Update] Failed to logout wrong number:`, err)
            }
            
            this.sockets.delete(outletId)
            this.isConnecting.delete(outletId)
            return // Stop processing
          }

          // Phone matches or no registered phone yet - proceed with connection
          try {
            await db.whatsappSession.update({
              where: { id: session!.id },
              data: {
                status: 'CONNECTED',
                qrCode: null,
                connectedAt: new Date(),
                retryCount: 0,
                sessionName: sessionName,
                phoneNumber: connectedPhone || registeredPhone || '', // Save actual connected number
                deviceInfo: deviceInfo as any,
                autoReconnect: true, // Enable auto-reconnect when connected
              },
            })
            console.log(`[Baileys] ✅ Outlet ${outletId} CONNECTED as ${sessionName} (${connectedPhone}) - Auto-reconnect enabled`)
            
            // Update outlet's WhatsApp number if empty
            if (!registeredPhone && connectedPhone) {
              console.log(`[Baileys] Updating outlet WhatsApp number to ${connectedPhone}`)
              await prisma.outlet.update({
                where: { id: outletId },
                data: { 
                  whatsappNumber: connectedPhone,
                  isWhatsappActive: true 
                }
              })
            } else {
              await prisma.outlet.update({
                where: { id: outletId },
                data: { isWhatsappActive: true }
              })
            }
          } catch (err) {
            console.error(`[Connection Update] Failed to update session status to CONNECTED:`, err)
          }
        }

        if (connection === 'close') {
          console.log(`[Connection Update] Socket closed for outlet ${outletId}, statusCode: ${statusCode}`)
          
          // Check if this close is due to phone mismatch
          const isPhoneMismatch = this.phoneMismatchBlocked.get(outletId)
          
          // Clear flags
          try {
            this.sockets.delete(outletId)
            this.isConnecting.delete(outletId)
          } catch (err) {
            console.error(`[Connection Update] Error removing socket:`, err)
          }
          
          try {
            await db.whatsappSession.update({
              where: { id: session!.id },
              data: { status: 'DISCONNECTED', qrCode: null, lastSeen: new Date() },
            })
          } catch (err) {
            console.error(`[Connection Update] Failed to update session status to DISCONNECTED:`, err)
          }

          try {
            await prisma.outlet.update({
              where: { id: outletId },
              data: { isWhatsappActive: false }
            })
          } catch (err) {
            console.error(`[Connection Update] Failed to update outlet isWhatsappActive:`, err)
          }

          // Don't auto-reconnect if phone mismatch
          if (isPhoneMismatch) {
            console.log(`[Connection Update] ⚠️ Phone mismatch detected for ${outletId} - NOT auto-reconnecting`)
            // Keep the flag until user manually retries
            return
          }

          // Handle logged out - reset session completely
          if (statusCode === DisconnectReason.loggedOut) {
            console.log(`[Connection Update] ⚠️ User logged out (${statusCode}), resetting session for outlet ${outletId}`)
            await this.resetSession(outletId)
            return // Don't auto-reconnect after logout
          }

          // Handle conflict (440) - another device is connected
          if (statusCode === 440) {
            const lastAttempt = this.reconnectCooldowns.get(outletId) || 0
            const timeSince = Date.now() - lastAttempt
            
            // Don't reconnect if we tried recently (within 60s)
            if (timeSince < TIMEOUTS.CONFLICT_COOLDOWN) {
              console.log(`[Connection Update] ⚠️ Conflict error (440) for ${outletId} - another device connected. Cooldown active (${Math.round((TIMEOUTS.CONFLICT_COOLDOWN - timeSince) / 1000)}s remaining)`)
              return
            }
            
            console.log(`[Connection Update] ⚠️ Conflict error (440) for ${outletId} - will retry after cooldown`)
          }

          // Auto-reconnect for other errors
          if (statusCode !== DisconnectReason.loggedOut && session!.autoReconnect) {
            const lastAttempt = this.reconnectCooldowns.get(outletId) || 0
            const timeSince = Date.now() - lastAttempt
            const cooldown = statusCode === 440 ? TIMEOUTS.CONFLICT_COOLDOWN : TIMEOUTS.RECONNECT_COOLDOWN
            
            if (timeSince < cooldown) {
              const remaining = Math.round((cooldown - timeSince) / 1000)
              console.log(`[Connection Update] Reconnect cooldown active for ${outletId} (${remaining}s remaining)`)
              return
            }
            
            console.log(`[Connection Update] Auto-reconnecting outlet ${outletId} in ${TIMEOUTS.AUTO_RECONNECT / 1000}s (statusCode: ${statusCode})`)
            this.reconnectCooldowns.set(outletId, Date.now())
            setTimeout(() => this.ensureSession(outletId), TIMEOUTS.AUTO_RECONNECT)
          }
        }
      } catch (error) {
        console.error(`[Connection Update] Unhandled error in connection.update for outlet ${outletId}:`, error)
      }
    })

    sock.ev.on('creds.update', saveCreds)
    
    } finally {
      // Clear connecting flag when done (success or error)
      this.isConnecting.delete(outletId)
    }
  }

  // Check if we have an active socket connection in-memory
  private isSocketConnected(outletId: string): boolean {
    const sock = this.sockets.get(outletId) as any
    if (!sock) return false

    // Check WebSocket connection state
    const ws = sock?.ws
    const wsOpen = !!ws && ws.readyState === 1

    // Check if socket is marked as connected by Baileys
    const isOpen = sock?.user?.id ? true : false

    return wsOpen && isOpen
  }

  // Verify connection is really active by checking socket state and user info
  private async verifyLiveConnection(outletId: string): Promise<boolean> {
    const sock = this.sockets.get(outletId) as any
    if (!sock) {
      console.log(`[Baileys] verifyLiveConnection: No socket for ${outletId}`)
      return false
    }

    try {
      // Check if socket has user info (authenticated)
      const user = sock?.user
      if (!user?.id) {
        console.log(`[Baileys] verifyLiveConnection: No user.id for ${outletId}, user:`, user)
        return false
      }

      // Check WebSocket status (but don't fail if ws property doesn't exist)
      const ws = sock?.ws
      if (ws) {
        const readyState = ws.readyState
        console.log(`[Baileys] verifyLiveConnection: WS readyState=${readyState} for ${outletId}`)

        // Only fail if ws exists but is explicitly closed (3) or closing (2)
        if (readyState === 2 || readyState === 3) {
          console.log(`[Baileys] verifyLiveConnection: WS is closing/closed for ${outletId}`)
          return false
        }
      } else {
        // WS property doesn't exist - this is OK for some Baileys versions
        // Just rely on user.id being present
        console.log(`[Baileys] verifyLiveConnection: No ws property, but user exists for ${outletId}`)
      }

      console.log(`[Baileys] verifyLiveConnection: ✅ VERIFIED for ${outletId}, user: ${user.id}`)
      return true
    } catch (err) {
      console.error(`[Baileys] verifyLiveConnection error for ${outletId}:`, err)
      return false
    }
  }

  async getSessionStatus(outletId: string, opts?: { live?: boolean }) {
    const db = prisma as any
    const session = await db.whatsappSession?.findFirst?.({ where: { outletId } })

    if (opts?.live) {
      // Ensure session exists in memory
      await this.ensureSession(outletId)

      // Wait for socket event listeners and DB updates to propagate
      await new Promise((r) => setTimeout(r, TIMEOUTS.DB_SYNC))

      // Verify connection is really active
      const liveConnected = await this.verifyLiveConnection(outletId)

      // Get fresh session from DB
      const freshSession = await db.whatsappSession?.findFirst?.({ where: { outletId } })
      const currentStatus = freshSession?.status ?? 'DISCONNECTED'

      // If DB says CONNECTED but actual connection is not active, sync to DISCONNECTED
      if (currentStatus === 'CONNECTED' && !liveConnected) {
        console.log(`[Baileys] SYNC NEEDED: Database says CONNECTED but socket verification failed for ${outletId}, syncing to DISCONNECTED`)
        await db.whatsappSession.updateMany({
          where: { outletId },
          data: { status: 'DISCONNECTED', qrCode: null, lastSeen: new Date() },
        })
        try {
          await prisma.outlet.update({
            where: { id: outletId },
            data: { isWhatsappActive: false }
          })
        } catch (err) {
          console.error(`[Baileys] Failed to update outlet:`, err)
        }
        const s2 = await db.whatsappSession.findFirst({ where: { outletId } })
        return { 
          status: s2?.status ?? 'DISCONNECTED', 
          qrCode: s2?.qrCode ?? null, 
          name: s2?.sessionName || null,
          deviceInfo: s2?.deviceInfo ?? null 
        }
      }

      // If DB says not CONNECTED but socket verification shows it IS connected, sync to CONNECTED
      if (currentStatus !== 'CONNECTED' && liveConnected) {
        console.log(`[Baileys] SYNC NEEDED: Socket verification shows CONNECTED but DB says ${currentStatus} for ${outletId}, syncing to CONNECTED`)
        const sock = this.sockets.get(outletId) as any
        const user = sock?.user || {}
        const { sessionName, deviceInfo } = this.getDeviceInfo(user)
        await db.whatsappSession.updateMany({
          where: { outletId },
          data: {
            status: 'CONNECTED',
            qrCode: null,
            connectedAt: new Date(),
            retryCount: 0,
            sessionName: sessionName,
            deviceInfo: deviceInfo as any,
            autoReconnect: true, // Enable auto-reconnect
          },
        })
        try {
          await prisma.outlet.update({
            where: { id: outletId },
            data: { isWhatsappActive: true }
          })
        } catch (err) {
          console.error(`[Baileys] Failed to update outlet:`, err)
        }
        const s2 = await db.whatsappSession.findFirst({ where: { outletId } })
        return { 
          status: s2?.status ?? 'CONNECTED', 
          qrCode: s2?.qrCode ?? null, 
          name: s2?.sessionName || null,
          deviceInfo: s2?.deviceInfo ?? null 
        }
      }
    }

    return {
      status: session?.status ?? 'DISCONNECTED',
      qrCode: session?.qrCode ?? null,
      name: session?.sessionName || null,
      deviceInfo: session?.deviceInfo ?? null,
    }
  }

  async startAndGetQR(outletId: string) {
    await this.ensureSession(outletId)
    // Wait for QR to be generated (up to 10 seconds)
    for (let i = 0; i < RETRY_CONFIG.MAX_QR_ATTEMPTS; i++) {
      const st = await this.getSessionStatus(outletId, { live: true })
      if (st.qrCode || st.status === 'CONNECTED') {
        return st
      }
      await new Promise((r) => setTimeout(r, 300))
    }

    // If still no QR, reset and try again
    const st1 = await this.getSessionStatus(outletId, { live: true })
    if (!st1.qrCode && st1.status !== 'CONNECTED') {
      await this.resetSession(outletId)
      await this.ensureSession(outletId)
      for (let i = 0; i < RETRY_CONFIG.MAX_QR_ATTEMPTS; i++) {
        const st = await this.getSessionStatus(outletId, { live: true })
        if (st.qrCode || st.status === 'CONNECTED') {
          return st
        }
        await new Promise((r) => setTimeout(r, 300))
      }
    }
    return this.getSessionStatus(outletId, { live: true })
  }

  // Force re-check connection status directly from WhatsApp socket
  async forceCheckConnection(outletId: string) {
    // Make sure socket is initialized
    await this.ensureSession(outletId)

    // Give socket time to stabilize and receive connection events
    // Try multiple times with increasing intervals to wait for CONNECTED status
    for (let attempt = 0; attempt < 10; attempt++) {
      const waitTime = attempt === 0 ? 200 : attempt < 3 ? 500 : 1000
      await new Promise((r) => setTimeout(r, waitTime))

      const status = await this.getSessionStatus(outletId, { live: false })

      if (status.status === 'CONNECTED') {
        const liveCheck = await this.verifyLiveConnection(outletId)
        if (liveCheck) {
          console.log(`[Baileys] Force check for ${outletId} found CONNECTED on attempt ${attempt + 1}`)
          return status
        }
      }

      // If has QR, return immediately (still connecting)
      if (status.qrCode) {
        console.log(`[Baileys] Force check found QR on attempt ${attempt + 1}`)
        return status
      }
    }

    const finalStatus = await this.getSessionStatus(outletId, { live: false })
    return finalStatus
  }

  // Force refresh outlet status - useful when status is out of sync
  async forceRefreshStatus(outletId: string) {
    console.log(`[Baileys] Force refreshing status for ${outletId}`)

    const db = prisma as any

    // First, ensure session is loaded in memory
    console.log(`[Baileys] Ensuring session is loaded...`)
    await this.ensureSession(outletId)

    // Wait for socket to stabilize
    await new Promise(r => setTimeout(r, 1500))

    // Try multiple times to verify connection (socket might still be initializing)
    let isConnected = false
    for (let attempt = 0; attempt < 5; attempt++) {
      console.log(`[Baileys] Verification attempt ${attempt + 1}/5...`)
      isConnected = await this.verifyLiveConnection(outletId)

      if (isConnected) {
        console.log(`[Baileys] ✅ Connection verified on attempt ${attempt + 1}`)
        break
      }

      // Wait before retry
      if (attempt < 4) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    if (isConnected) {
      console.log(`[Baileys] Socket is CONNECTED, updating DB...`)

      const sock = this.sockets.get(outletId) as any
      const user = sock?.user || {}
      const { sessionName, deviceInfo } = this.getDeviceInfo(user)

      await db.whatsappSession.updateMany({
        where: { outletId },
        data: {
          status: 'CONNECTED',
          qrCode: null,
          connectedAt: new Date(),
          sessionName: sessionName,
          deviceInfo: deviceInfo as any,
          autoReconnect: true,
        },
      })

      await prisma.outlet.update({
        where: { id: outletId },
        data: { isWhatsappActive: true },
      })

      console.log(`[Baileys] ✅ ${outletId} refreshed to CONNECTED`)
      return { status: 'CONNECTED', qrCode: null, name: sessionName }
    } else {
      console.log(`[Baileys] ⚠️ Socket NOT connected after 5 attempts, checking DB session...`)

      // Check if session exists in DB and has credentials saved
      const session = await db.whatsappSession.findFirst({ where: { outletId } })
      const sessionDir = this.sessionsDirFor(outletId)
      const hasCredentials = fs.existsSync(sessionDir)
      
      // Check if there's an active QR code
      const hasActiveQR = !!session?.qrCode

      if (hasActiveQR) {
        console.log(`[Baileys] QR code is active, marking as CONNECTING (needs scan)...`)

        await db.whatsappSession.updateMany({
          where: { outletId },
          data: {
            status: 'CONNECTING',
            lastSeen: new Date(),
          },
        })

        return { status: 'CONNECTING', qrCode: session.qrCode, name: session.sessionName }
      } else if (hasCredentials && session?.autoReconnect) {
        console.log(`[Baileys] Session credentials exist, will attempt auto-reconnect...`)

        // Try to reconnect in background
        this.ensureSession(outletId).catch(() => void 0)
        
        // Wait briefly to see if QR appears or connection succeeds
        await new Promise(r => setTimeout(r, 2000))
        
        const updatedSession = await db.whatsappSession.findFirst({ where: { outletId } })
        
        if (updatedSession?.qrCode) {
          console.log(`[Baileys] QR code generated, marking as CONNECTING...`)
          await db.whatsappSession.updateMany({
            where: { outletId },
            data: { status: 'CONNECTING' },
          })
          return { status: 'CONNECTING', qrCode: updatedSession.qrCode, name: updatedSession.sessionName }
        }
        
        // Check if already connected
        const isNowConnected = await this.verifyLiveConnection(outletId)
        if (isNowConnected) {
          console.log(`[Baileys] ✅ Auto-reconnect successful!`)
          const sock = this.sockets.get(outletId) as any
          const user = sock?.user || {}
          const { sessionName, deviceInfo } = this.getDeviceInfo(user)
          
          await db.whatsappSession.updateMany({
            where: { outletId },
            data: {
              status: 'CONNECTED',
              qrCode: null,
              connectedAt: new Date(),
              sessionName: sessionName,
              deviceInfo: deviceInfo as any,
            },
          })
          
          await prisma.outlet.update({
            where: { id: outletId },
            data: { isWhatsappActive: true },
          })
          
          return { status: 'CONNECTED', qrCode: null, name: sessionName }
        }

        console.log(`[Baileys] Auto-reconnect in progress, marking as DISCONNECTED for now...`)
        await db.whatsappSession.updateMany({
          where: { outletId },
          data: {
            status: 'DISCONNECTED',
            lastSeen: new Date(),
          },
        })

        return { status: 'DISCONNECTED', qrCode: null, name: session.sessionName }
      } else {
        console.log(`[Baileys] No credentials or autoReconnect disabled, marking DISCONNECTED...`)

        await db.whatsappSession.updateMany({
          where: { outletId },
          data: {
            status: 'DISCONNECTED',
            qrCode: null,
            lastSeen: new Date(),
          },
        })

        await prisma.outlet.update({
          where: { id: outletId },
          data: { isWhatsappActive: false },
        })

        console.log(`[Baileys] ✅ ${outletId} refreshed to DISCONNECTED`)
        return { status: 'DISCONNECTED', qrCode: null, name: null }
      }
    }
  }

  async sendMessage(outletId: string, toPhone: string, text: string, retryCount = 0, maxRetries = RETRY_CONFIG.MAX_RETRIES): Promise<void> {
    try {
      console.log(`[Blast] Sending to ${toPhone}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`)

      // Ensure session is loaded
      await this.ensureSession(outletId)

      // Get socket
      let sock = this.sockets.get(outletId)
      if (!sock) {
        throw new Error(`Socket not found for outlet ${outletId}. WhatsApp may not be connected.`)
      }

      // Check socket is actually connected
      let user = (sock as any)?.user
      if (!user?.id) {
        console.log(`[Blast] Socket not authenticated yet, waiting ${TIMEOUTS.SOCKET_WAIT}ms...`)
        await new Promise(r => setTimeout(r, TIMEOUTS.SOCKET_WAIT))

        sock = this.sockets.get(outletId)
        if (!sock) {
          throw new Error(`Socket not found after wait for outlet ${outletId}`)
        }
        user = (sock as any)?.user
        if (!user?.id) {
          throw new Error(`Socket for outlet ${outletId} is not authenticated`)
        }
      }

      console.log(`[Blast] Socket verified with user ${user.id}`)

      // Convert phone to JID
      const jid = toJid(toPhone)
      console.log(`[Blast] Converted ${toPhone} → ${jid}`)

      // Check WebSocket state (if available)
      const ws = (sock as any)?.ws
      if (ws && ws.readyState !== 1) {
        console.warn(`[Blast] WebSocket state ${ws.readyState}, will attempt send anyway`)
      }

      // Send message
      console.log(`[Blast] Sending "${text}"...`)
      await sock.sendMessage(jid, { text } as AnyMessageContent)

      console.log(`[Blast] ✅ Message sent to ${jid}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Blast] ❌ Error:`, errorMsg)

      // Retry on connection errors
      const isConnectionError = errorMsg.includes('Connection Closed') ||
        errorMsg.includes('Timeout') ||
        errorMsg.includes('not open')

      if (isConnectionError && retryCount < maxRetries) {
        console.log(`[Blast] Retrying ${retryCount + 1}/${maxRetries} after ${TIMEOUTS.RETRY_DELAY}ms...`)
        await new Promise(r => setTimeout(r, TIMEOUTS.RETRY_DELAY))
        return this.sendMessage(outletId, toPhone, text, retryCount + 1, maxRetries)
      }

      throw error
    }
  }

  // Send message with image
  async sendImageMessage(
    outletId: string, 
    toPhone: string, 
    imageBuffer: Buffer, 
    caption?: string,
    retryCount = 0, 
    maxRetries = RETRY_CONFIG.MAX_RETRIES
  ): Promise<void> {
    try {
      console.log(`[Blast] Sending image to ${toPhone}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`)

      // Ensure session is loaded and connected
      await this.ensureSession(outletId)

      let sock = this.sockets.get(outletId)
      if (!sock) {
        throw new Error(`Socket not found for outlet ${outletId}. WhatsApp may not be connected.`)
      }

      // Check socket authentication
      let user = (sock as any)?.user
      if (!user?.id) {
        console.log(`[Blast] Socket not authenticated yet, waiting ${TIMEOUTS.SOCKET_WAIT}ms...`)
        await new Promise(r => setTimeout(r, TIMEOUTS.SOCKET_WAIT))
        sock = this.sockets.get(outletId)
        if (!sock) {
          throw new Error(`Socket not found after wait for outlet ${outletId}`)
        }
        user = (sock as any)?.user
        if (!user?.id) {
          throw new Error(`Socket for outlet ${outletId} is not authenticated`)
        }
      }

      // Wait for connection to be truly stable before sending media
      // This is critical when multiple devices are connected
      let connectionReady = false
      const maxWaitAttempts = 10
      
      for (let attempt = 0; attempt < maxWaitAttempts; attempt++) {
        // Re-fetch socket to get latest state
        sock = this.sockets.get(outletId)
        if (!sock) {
          throw new Error(`Socket lost for outlet ${outletId}`)
        }
        
        const currentUser = (sock as any)?.user
        if (currentUser?.id) {
          connectionReady = true
          break
        }
        
        // Wait before retry
        await new Promise(r => setTimeout(r, 300))
      }
      
      if (!connectionReady) {
        throw new Error('Connection not stable after waiting. Please try again.')
      }
      
      // Additional stabilization delay for media
      await new Promise(r => setTimeout(r, 500))

      const jid = toJid(toPhone)
      console.log(`[Blast] Sending image to ${jid}${caption ? ` with caption: "${caption.substring(0, 50)}..."` : ''}`)

      await sock.sendMessage(jid, {
        image: imageBuffer,
        caption: caption || ''
      } as AnyMessageContent)

      console.log(`[Blast] ✅ Image sent successfully to ${jid}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Blast] ❌ Error sending image:`, errorMsg)

      // Check for conflict error (440) - don't retry if another device is connected
      const isConflictError = errorMsg.includes('440') || 
        errorMsg.includes('conflict') || 
        errorMsg.includes('replaced')

      if (isConflictError) {
        console.error(`[Blast] ⚠️ Conflict detected (error 440). Another device may be connected. Cannot retry.`)
        throw new Error('Cannot send message: Another device is connected to this WhatsApp account')
      }

      const isConnectionError = errorMsg.includes('Connection Closed') ||
        errorMsg.includes('Timeout') ||
        errorMsg.includes('not open') ||
        errorMsg.includes('WebSocket')

      if (isConnectionError && retryCount < maxRetries) {
        console.log(`[Blast] Retrying ${retryCount + 1}/${maxRetries} after ${TIMEOUTS.RETRY_DELAY}ms...`)
        await new Promise(r => setTimeout(r, TIMEOUTS.RETRY_DELAY))
        return this.sendImageMessage(outletId, toPhone, imageBuffer, caption, retryCount + 1, maxRetries)
      }

      throw error
    }
  }

  // Send message with document
  async sendDocumentMessage(
    outletId: string, 
    toPhone: string, 
    documentBuffer: Buffer,
    fileName: string,
    mimetype: string,
    caption?: string,
    retryCount = 0, 
    maxRetries = RETRY_CONFIG.MAX_RETRIES
  ): Promise<void> {
    try {
      console.log(`[Blast] Sending document ${fileName} to ${toPhone}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`)

      // Ensure session is loaded and connected
      await this.ensureSession(outletId)

      let sock = this.sockets.get(outletId)
      if (!sock) {
        throw new Error(`Socket not found for outlet ${outletId}. WhatsApp may not be connected.`)
      }

      // Check socket authentication
      let user = (sock as any)?.user
      if (!user?.id) {
        console.log(`[Blast] Socket not authenticated yet, waiting ${TIMEOUTS.SOCKET_WAIT}ms...`)
        await new Promise(r => setTimeout(r, TIMEOUTS.SOCKET_WAIT))
        sock = this.sockets.get(outletId)
        if (!sock) {
          throw new Error(`Socket not found after wait for outlet ${outletId}`)
        }
        user = (sock as any)?.user
        if (!user?.id) {
          throw new Error(`Socket for outlet ${outletId} is not authenticated`)
        }
      }

      // Wait for connection to be truly stable before sending document
      let connectionReady = false
      const maxWaitAttempts = 10
      
      for (let attempt = 0; attempt < maxWaitAttempts; attempt++) {
        sock = this.sockets.get(outletId)
        if (!sock) {
          throw new Error(`Socket lost for outlet ${outletId}`)
        }
        
        const currentUser = (sock as any)?.user
        if (currentUser?.id) {
          connectionReady = true
          break
        }
        
        await new Promise(r => setTimeout(r, 300))
      }
      
      if (!connectionReady) {
        throw new Error('Connection not stable after waiting. Please try again.')
      }
      
      await new Promise(r => setTimeout(r, 500))

      const jid = toJid(toPhone)
      console.log(`[Blast] Sending document to ${jid}${caption ? ` with caption: "${caption.substring(0, 50)}..."` : ''}`)

      await sock.sendMessage(jid, {
        document: documentBuffer,
        fileName: fileName,
        mimetype: mimetype,
        caption: caption || ''
      } as AnyMessageContent)

      console.log(`[Blast] ✅ Document sent successfully to ${jid}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Blast] ❌ Error sending document:`, errorMsg)

      // Check for conflict error (440) - don't retry if another device is connected
      const isConflictError = errorMsg.includes('440') || 
        errorMsg.includes('conflict') || 
        errorMsg.includes('replaced')

      if (isConflictError) {
        console.error(`[Blast] ⚠️ Conflict detected (error 440). Another device may be connected. Cannot retry.`)
        throw new Error('Cannot send message: Another device is connected to this WhatsApp account')
      }

      const isConnectionError = errorMsg.includes('Connection Closed') ||
        errorMsg.includes('Timeout') ||
        errorMsg.includes('not open') ||
        errorMsg.includes('WebSocket')

      if (isConnectionError && retryCount < maxRetries) {
        console.log(`[Blast] Retrying ${retryCount + 1}/${maxRetries} after ${TIMEOUTS.RETRY_DELAY}ms...`)
        await new Promise(r => setTimeout(r, TIMEOUTS.RETRY_DELAY))
        return this.sendDocumentMessage(outletId, toPhone, documentBuffer, fileName, mimetype, caption, retryCount + 1, maxRetries)
      }

      throw error
    }
  }

  // Send message with media (auto detect type)
  async sendMediaMessage(
    outletId: string,
    toPhone: string,
    text: string,
    mediaFiles?: { buffer: Buffer; fileName: string; mimetype: string }[],
    retryCount = 0,
    maxRetries = RETRY_CONFIG.MAX_RETRIES
  ): Promise<void> {
    try {
      // Send text message first if provided
      if (text && text.trim()) {
        await this.sendMessage(outletId, toPhone, text, retryCount, maxRetries)
      }

      // Send media files
      if (mediaFiles && mediaFiles.length > 0) {
        for (const media of mediaFiles) {
          const isImage = media.mimetype.startsWith('image/')
          
          if (isImage) {
            await this.sendImageMessage(outletId, toPhone, media.buffer, '', retryCount, maxRetries)
          } else {
            await this.sendDocumentMessage(
              outletId, 
              toPhone, 
              media.buffer, 
              media.fileName, 
              media.mimetype, 
              '', 
              retryCount, 
              maxRetries
            )
          }
        }
      }
    } catch (error) {
      console.error(`[Blast] ❌ Error sending media message:`, error)
      throw error
    }
  }

  // Helper: Find a connected socket for verification
  private async findConnectedSocket(): Promise<WASocket | null> {
    // Step 1: Check in-memory sockets
    for (const [outletId, socket] of this.sockets.entries()) {
      const user = (socket as any)?.user
      if (user?.id) {
        console.log(`[Baileys] Found active socket from outlet ${outletId}`)
        return socket
      }
    }

    const db = prisma as any

    // Step 2: Check DB for connected sessions
    try {
      const sessions = await db.whatsappSession?.findMany?.({
        where: { status: 'CONNECTED' },
        take: 3,
      }) || []

      for (const session of sessions) {
        await this.ensureSession(session.outletId)
        await new Promise((r) => setTimeout(r, TIMEOUTS.PHONE_CHECK_INIT))

        const socket = this.sockets.get(session.outletId)
        if (socket) {
          const user = (socket as any)?.user
          if (user?.id) {
            console.log(`[Baileys] Loaded session from outlet ${session.outletId}`)
            return socket
          }
        }
      }
    } catch (err) {
      console.error(`[Baileys] Error checking DB sessions:`, err)
    }

    // Step 3: Try to initialize from any outlet with WhatsApp
    try {
      const outlets = await prisma.outlet.findMany({
        where: { whatsappNumber: { not: '' } },
        take: 2,
      }) || []

      for (const outlet of outlets) {
        if (!outlet.id) continue

        try {
          await this.ensureSession(outlet.id)
          await new Promise((r) => setTimeout(r, TIMEOUTS.PHONE_CHECK_INIT_LONG))

          const socket = this.sockets.get(outlet.id)
          if (socket) {
            const user = (socket as any)?.user
            if (user?.id) {
              console.log(`[Baileys] Auto-initialized socket from outlet ${outlet.id}`)
              return socket
            }
          }
        } catch (err) {
          console.log(`[Baileys] Auto-init failed for ${outlet.id}:`, (err as any)?.message)
        }
      }
    } catch (err) {
      console.error(`[Baileys] Error auto-initializing:`, err)
    }

    // Step 4: Wait for any in-memory socket to connect
    if (this.sockets.size > 0) {
      console.log(`[Baileys] Waiting for ${this.sockets.size} socket(s) to connect...`)

      for (let i = 0; i < RETRY_CONFIG.MAX_PHONE_CHECK_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, TIMEOUTS.PHONE_CHECK_WAIT))

        for (const [, socket] of this.sockets.entries()) {
          const user = (socket as any)?.user
          if (user?.id) {
            return socket
          }
        }
      }
    }

    return null
  }

  // Check if a phone number is valid and active on WhatsApp
  async checkPhoneNumberValid(phoneNumber: string): Promise<{ valid: boolean; exists: boolean; message: string }> {
    try {
      // Normalize phone number - remove all non-digits
      const digits = phoneNumber.replace(/\D/g, '')

      // First: Basic length check
      if (digits.length < 10) {
        return { valid: false, exists: false, message: 'Nomor telepon terlalu pendek (minimal 10 digit)' }
      }

      if (digits.length > 15) {
        return { valid: false, exists: false, message: 'Nomor telepon terlalu panjang (maksimal 15 digit)' }
      }

      // Second: Format validation for Indonesian numbers
      if (!this.isValidPhoneFormat(phoneNumber)) {
        return { valid: false, exists: false, message: 'Format nomor tidak valid. Gunakan format: +628xx atau 08xx' }
      }

      // Third: Find a connected socket for verification
      const connectedSocket = await this.findConnectedSocket()

      if (!connectedSocket) {
        return { valid: true, exists: false, message: 'Format valid. Tidak ada akun WhatsApp yang terhubung untuk verifikasi. Silakan hubungkan minimal 1 outlet terlebih dahulu untuk verifikasi nomor aktif.' }
      }

      try {
        const jid = toJid(phoneNumber)

        // Create a timeout promise that rejects after 12 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout: onWhatsApp check exceeded 12s')), TIMEOUTS.PHONE_CHECK)
        })

        // Race between actual call and timeout
        let results: any[] = []
        try {
          results = await Promise.race([
            (connectedSocket as any).onWhatsApp(jid),
            timeoutPromise
          ]) as any[]
        } catch (raceError) {
          // If timeout occurred, still return valid but unverified
          if ((raceError as any)?.message?.includes('Timeout')) {
            console.warn(`[Baileys] onWhatsApp check timed out for ${phoneNumber}`)
            return { valid: true, exists: false, message: 'Format valid. Verifikasi WhatsApp sedang diproses, silakan coba lagi dalam beberapa saat.' }
          }
          throw raceError
        }

        const result = results && results.length > 0 ? results[0] : null

        if (result?.exists) {
          return { valid: true, exists: true, message: 'Nomor WhatsApp aktif ✓' }
        } else {
          return { valid: false, exists: false, message: 'Nomor tidak terdaftar di WhatsApp atau tidak aktif' }
        }
      } catch (checkError) {
        console.error(`[Baileys] onWhatsApp check error:`, checkError)
        return { valid: true, exists: false, message: 'Format valid. Verifikasi WhatsApp gagal, coba manual check.' }
      }
    } catch (error) {
      console.error(`[Baileys] Error checking phone number:`, error)
      return { valid: true, exists: false, message: 'Format valid. Silakan hubungkan WhatsApp untuk verifikasi.' }
    }
  }

  async resetSession(outletId: string) {
    // Close and remove socket if exists
    const sock = this.sockets.get(outletId)
    try {
      if (sock) {
        try { await (sock as any).logout?.() } catch { }
        try { (sock as any).ws?.close?.() } catch { }
      }
    } finally {
      this.sockets.delete(outletId)
      this.isConnecting.delete(outletId)
      this.reconnectCooldowns.delete(outletId)
      this.phoneMismatchBlocked.delete(outletId) // Clear mismatch block
    }

    // Remove local auth files
    const dir = this.sessionsDirFor(outletId)
    if (fs.existsSync(dir)) {
      try { fs.rmSync(dir, { recursive: true, force: true }) } catch { }
    }

    // Reset DB session state
    const db = prisma as any
    await db.whatsappSession.updateMany({
      where: { outletId },
      data: { status: 'DISCONNECTED', qrCode: null, retryCount: 0, lastSeen: new Date(), autoReconnect: false, deviceInfo: null },
    })
  }

  // Disconnect a session without deleting credentials (soft disconnect)
  async disconnectSession(outletId: string) {
    console.log(`[Baileys] Disconnecting session for ${outletId}`)
    
    const sock = this.sockets.get(outletId)
    if (sock) {
      try {
        (sock as any).ws?.close?.()
      } catch (err) {
        console.error(`[Baileys] Error closing socket:`, err)
      }
    }
    
    this.sockets.delete(outletId)
    this.isConnecting.delete(outletId)
    this.reconnectCooldowns.delete(outletId)
    this.phoneMismatchBlocked.delete(outletId) // Clear mismatch block

    const db = prisma as any
    await db.whatsappSession.updateMany({
      where: { outletId },
      data: { status: 'DISCONNECTED', qrCode: null, autoReconnect: false },
    })
    
    await prisma.outlet.update({
      where: { id: outletId },
      data: { isWhatsappActive: false }
    })
    
    console.log(`[Baileys] ✅ Session disconnected for ${outletId}`)
  }
}

export default BaileysService.getInstance()