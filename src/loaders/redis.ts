import { Redis } from '@upstash/redis/cloudflare'
import type { MedusaContainer } from "@medusajs/framework"

interface RedisService {
  getClient: () => Redis
}

const redisLoader = async (container: MedusaContainer) => {
  // Get config with type assertion to avoid TypeScript errors
  const configModule = container.resolve("configModule")
  
  // Use Upstash REST credentials from custom config fields
  const redisRestUrl = (configModule?.projectConfig as any)?.redisRestUrl
  const redisRestToken = (configModule?.projectConfig as any)?.redisRestToken
  
  if (!redisRestUrl || !redisRestToken) {
    console.warn('Upstash REST credentials not found, using in-memory cache')
    return
  }

  try {
    const client = new Redis({
      url: redisRestUrl,
      token: redisRestToken,
    })

    // Test the connection with a timeout
    const testConnection = async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
      
      const connect = client.set('medusa:test', 'connected', { ex: 60 })
      
      return Promise.race([connect, timeout])
        .then(async () => {
          const test = await client.get('medusa:test')
          return test === 'connected'
        })
    }

    const isConnected = await testConnection()
    
    if (!isConnected) {
      throw new Error('Redis connection test failed')
    }

    // Create a service to access the Redis client
    const redisService: RedisService = {
      getClient: () => client
    }

    // Register the service in the container
    container.register('redis', {
      resolve: () => redisService
    })
    
    console.log('✅ Upstash Redis (REST) connected successfully')
  } catch (err) {
    console.error('❌ Error connecting to Upstash Redis (REST):', err)
    // Don't throw to allow the application to start with in-memory cache
    console.warn('⚠️ Falling back to in-memory cache')
  }
}

export default redisLoader
