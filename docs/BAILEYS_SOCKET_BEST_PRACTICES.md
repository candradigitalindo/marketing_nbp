# Baileys Socket Best Practices

## 🎯 Socket Lifecycle Management

### 1. Connection States

Every Baileys socket goes through these states:

```
DISCONNECTED
    ↓
CONNECTING (waiting for QR)
    ↓
CONNECTED (authenticated)
    ↓
RECONNECTING (after disconnect)
    ↓
DISCONNECTED (final)
```

**State Tracking in DB:**
```typescript
enum WhatsappSessionStatus {
  DISCONNECTED = 'DISCONNECTED',  // No socket active
  CONNECTING = 'CONNECTING',      // QR code shown, waiting
  CONNECTED = 'CONNECTED',        // Ready for operations
  RECONNECTING = 'RECONNECTING',  // Auto-reconnect in progress
  ERROR = 'ERROR'                 // Last error state
}
```

### 2. Socket Operations Timeout Thresholds

| Operation | Default Timeout | Our Timeout | Reason |
|-----------|-----------------|-------------|--------|
| Connection | 30s | (same) | WebSocket handshake |
| Send message | 30s | (same) | Server ACK |
| Check number | 30s | 12s | Too long, fallback better |
| Get contacts | 30s | (same) | Bulk operation |
| Download media | 60s | (same) | Network dependent |

### 3. Why Timeouts Happen

```
socket.onWhatsApp(jid)
    ↓
Sends IQ query to WhatsApp
    ↓
Waits for response
    ├─ ✓ Response in 1-3s: Success
    ├─ ⚠️ Response in 3-10s: Slow but OK
    ├─ ❌ No response in 30s: TIMEOUT
    └─ 🔌 Connection lost: TIMEOUT
```

**Common timeout triggers:**
1. Network latency > 3s
2. Socket overloaded (too many pending requests)
3. WhatsApp server rate limiting
4. WebSocket connection unstable
5. Firewall/proxy interference

### 4. Socket Health Indicators

**Healthy socket:**
```javascript
{
  user: {
    id: "6281260268381@s.whatsapp.net",
    name: "User Name",
    jid: "6281260268381@s.whatsapp.net",
    status: "available",
    picture: "..."
  },
  ev: EventEmitter,
  ws: WebSocket {
    readyState: 1  // OPEN
  },
  state: {
    connection: "open",
    qr: null,
    isNewLogin: false
  }
}
```

**Unhealthy socket:**
```javascript
{
  user: undefined,  // ❌ Not authenticated
  ws: WebSocket {
    readyState: 0  // ❌ CONNECTING/CLOSED
  },
  state: {
    connection: "close",
    qr: null
  }
}
```

## 🔧 Implementation Best Practices

### 1. Always Check Socket Health Before Operations

```typescript
async function checkSocketHealth(socket: WASocket): Promise<boolean> {
  try {
    // Method 1: Check user property
    if (!(socket as any)?.user?.id) {
      console.warn('Socket has no authenticated user')
      return false
    }

    // Method 2: Check WebSocket state
    if ((socket as any)?.ws?.readyState !== 1) {
      console.warn('Socket WebSocket not open')
      return false
    }

    // Method 3: Try ping (optional, more expensive)
    // await socket.fetchPrivacySettings()

    return true
  } catch (error) {
    console.error('Socket health check failed:', error)
    return false
  }
}
```

### 2. Implement Graceful Degradation

```typescript
async function checkPhoneWithFallback(phoneNumber: string): Promise<VerifyResult> {
  try {
    // Step 1: Try to find connected socket
    const socket = this.findConnectedSocket()
    if (!socket) {
      // Step 2: Fallback - just validate format
      if (isValidPhoneFormat(phoneNumber)) {
        return { valid: true, exists: false, message: 'No session to verify' }
      }
      return { valid: false, exists: false, message: 'Invalid format' }
    }

    // Step 3: Try verification with timeout
    const result = await this.verifyPhoneWithTimeout(socket, phoneNumber, 12_000)
    return result
  } catch (error) {
    // Step 4: Final fallback
    return { valid: true, exists: false, message: 'Verification failed, format valid' }
  }
}
```

### 3. Implement Circuit Breaker Pattern

```typescript
class SocketCircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  private readonly FAILURE_THRESHOLD = 5
  private readonly SUCCESS_THRESHOLD = 2
  private readonly TIMEOUT = 60_000

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN state: reject immediately
    if (this.state === 'OPEN') {
      if (Date.now() > this.lastFailureTime + this.TIMEOUT) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
      } else {
        throw new Error('Circuit breaker OPEN: socket unhealthy')
      }
    }

    try {
      const result = await fn()
      
      // Success
      this.failureCount = 0
      if (this.state === 'HALF_OPEN') {
        this.successCount++
        if (this.successCount >= this.SUCCESS_THRESHOLD) {
          this.state = 'CLOSED'
        }
      }
      
      return result
    } catch (error) {
      // Failure
      this.failureCount++
      if (this.failureCount >= this.FAILURE_THRESHOLD) {
        this.state = 'OPEN'
        this.lastFailureTime = Date.now()
      }
      throw error
    }
  }
}
```

### 4. Use Exponential Backoff for Retries

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxAttempts - 1) {
        // Calculate backoff: 1s, 2s, 4s, ...
        const delayMs = initialDelayMs * Math.pow(2, attempt)
        console.warn(`Retry ${attempt + 1}/${maxAttempts} after ${delayMs}ms:`, error)
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }

  throw lastError
}

// Usage:
const result = await retryWithBackoff(
  () => socket.onWhatsApp(jid),
  3,  // max 3 attempts
  1000  // start with 1s
)
```

### 5. Implement Connection Pooling

```typescript
class SocketPool {
  private sockets: Map<string, WASocket> = new Map()
  private maxSockets = 10
  
  async getSocket(): Promise<WASocket> {
    // Find healthy socket
    for (const [id, socket] of this.sockets) {
      if (await this.isHealthy(socket)) {
        return socket
      }
    }

    // Create new if under limit
    if (this.sockets.size < this.maxSockets) {
      return await this.createSocket()
    }

    // Wait for one to become available
    return await this.waitForSocket()
  }

  private async isHealthy(socket: WASocket): Promise<boolean> {
    return !!(socket as any)?.user?.id
  }

  private async createSocket(): Promise<WASocket> {
    // Initialize and return socket
    // ...
  }

  private async waitForSocket(): Promise<WASocket> {
    // Poll for available socket (max 30s)
    for (let i = 0; i < 30; i++) {
      for (const [id, socket] of this.sockets) {
        if (await this.isHealthy(socket)) {
          return socket
        }
      }
      await new Promise(r => setTimeout(r, 1000))
    }
    throw new Error('No socket available after 30s')
  }
}
```

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: No Socket Health Check
```typescript
// ❌ BAD: Assumes socket is ready
const result = await socket.onWhatsApp(jid)
```

✅ **GOOD:**
```typescript
// ✅ GOOD: Check first
if (!(socket as any)?.user?.id) {
  throw new Error('Socket not ready')
}
const result = await socket.onWhatsApp(jid)
```

### ❌ Mistake 2: Infinite Waiting
```typescript
// ❌ BAD: Could wait forever
while (!socket.user?.id) {
  await new Promise(r => setTimeout(r, 100))
}
```

✅ **GOOD:**
```typescript
// ✅ GOOD: Maximum timeout
const maxWaitMs = 15000
const startTime = Date.now()
while (!socket.user?.id && Date.now() - startTime < maxWaitMs) {
  await new Promise(r => setTimeout(r, 100))
}
if (!socket.user?.id) {
  throw new Error('Socket timeout')
}
```

### ❌ Mistake 3: No Error Context
```typescript
// ❌ BAD: Doesn't know what failed
try {
  await socket.onWhatsApp(jid)
} catch (error) {
  throw error
}
```

✅ **GOOD:**
```typescript
// ✅ GOOD: Clear error context
try {
  console.log(`[Socket] Checking ${jid}...`)
  await socket.onWhatsApp(jid)
} catch (error) {
  console.error(`[Socket] Failed for ${jid}:`, error)
  console.error(`[Socket] Socket state:`, {
    hasUser: !!socket.user?.id,
    wsReady: socket.ws?.readyState,
    time: new Date().toISOString()
  })
  throw error
}
```

### ❌ Mistake 4: Blocking Operations
```typescript
// ❌ BAD: Blocks entire server
for (const number of numbers) {
  await checkPhoneNumber(number)  // Sequential
}
```

✅ **GOOD:**
```typescript
// ✅ GOOD: Parallel with limits
const results = await Promise.allSettled(
  numbers.map(n => checkPhoneNumber(n))
)
```

## 🔍 Debugging Utilities

### Check Socket Vitals
```typescript
function debugSocket(socket: WASocket): string {
  const s = socket as any
  return `
Socket Debug Info:
  - User: ${s?.user?.id || 'NONE'}
  - Name: ${s?.user?.name || 'NONE'}
  - WS Ready: ${s?.ws?.readyState === 1 ? 'OPEN' : 'CLOSED'}
  - Connection: ${s?.ev ? 'listening' : 'not listening'}
  - Uptime: ${s?.user ? 'connected' : 'disconnected'}
`
}
```

### Monitor Socket Events
```typescript
function monitorSocket(socket: WASocket): void {
  socket.ev.on('connection.update', (update) => {
    console.log('[Socket Event] connection.update:', {
      connection: update.connection,
      qr: update.qr ? '...' : null,
      lastDisconnect: update.lastDisconnect?.error?.message
    })
  })

  socket.ev.on('connection.open', () => {
    console.log('[Socket Event] connection.open')
  })

  socket.ev.on('messages.upsert', (msg) => {
    console.log('[Socket Event] messages.upsert:', msg.messages.length)
  })
}
```

## 📊 Monitoring Metrics

Track these metrics for socket health:

```typescript
interface SocketMetrics {
  totalConnections: number
  activeConnections: number
  failedVerifications: number
  timeoutErrors: number
  averageResponseTime: number
  uptime: number
  lastError?: string
  lastErrorTime?: Date
}
```

## 🔗 Related Files
- Service implementation: `src/modules/wa/services/baileys.service.ts`
- Socket connection: `src/modules/wa/services/baileys.service.ts` (connect method)
- Status monitoring: `src/app/api/outlets/status/route.ts`
- Health dashboard: `src/app/outlet-status/page.tsx`

---

**Best Practices Version:** 1.0  
**Last Updated:** October 25, 2025
