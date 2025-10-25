import Redis from 'ioredis'

// Singleton Redis connection
let redis: Redis | null = null

export function getRedisConnection(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully')
    })

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err)
    })
  }

  return redis
}

export async function closeRedisConnection() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
