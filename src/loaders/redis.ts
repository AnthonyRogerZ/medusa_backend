import { Redis } from '@upstash/redis/cloudflare'
import type { MedusaContainer } from "@medusajs/framework"

interface ConfigModule {
  projectConfig: {
    redisUrl: string
    redisToken?: string
  }
}

interface RedisService {
  getClient: () => Redis
}

const redisLoader = async (container: MedusaContainer) => {
  const configModule = container.resolve<ConfigModule>("configModule")
  const { redisUrl, redisToken } = configModule.projectConfig
  
  if (!redisUrl) {
    console.warn('Redis URL not found, using in-memory cache')
    return
  }

  try {
    const client = new Redis({
      url: redisUrl,
      token: redisToken || '',
    })

    // Test the connection
    await client.set('medusa:test', 'connected')
    const test = await client.get('medusa:test')
    
    if (test !== 'connected') {
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
    
    console.log('Upstash Redis connected successfully')
  } catch (err) {
    console.error('Error connecting to Upstash Redis:', err)
    // Don't throw to allow the application to start with in-memory cache
    console.warn('Falling back to in-memory cache')
  }
}

export default redisLoader
