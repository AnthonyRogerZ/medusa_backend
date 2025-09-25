import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())


module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // IMPORTANT: This must be a Redis protocol URL (e.g., rediss://:password@host:port)
    // Prefer REDIS_URL (Railway/Upstash Redis TLS) or fallback to UPSTASH_REDIS_URL
    redisUrl: process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL,
    // Configure Redis connection and TTL settings
    redisOptions: {
      // Enable auto-pipelining to reduce round trips
      enableAutoPipelining: true,
      // Connection timeout in milliseconds
      connectTimeout: 10000,
      // Maximum number of retries per request
      maxRetriesPerRequest: 3,
      // Enable auto-resubscribing to channels on reconnection
      enableOfflineQueue: false,
      // Key prefix for all keys (to avoid collisions)
      keyPrefix: 'medusa:',
      // Enable ready checking to ensure Redis is ready
      enableReadyCheck: true,
      // Maximum number of connections in the pool
      maxConnections: 10,
      // Minimum number of idle connections to keep in the pool
      minIdle: 1,
      // Maximum number of idle connections to keep in the pool
      maxIdle: 5,
      // Time in milliseconds after which idle connections are closed
      idleTimeout: 60000,
      // Time in milliseconds to wait for a connection to become available
      acquireTimeout: 10000
    },
    // Configure cache TTLs (in seconds)
    cache_ttl: {
      product: 1800,      // 30 minutes
      variant: 1800,      // 30 minutes
      collection: 7200,   // 2 hours
      region: 86400,      // 24 hours
      shipping: 43200,    // 12 hours
      tax: 86400,         // 24 hours
      currency: 86400,    // 24 hours
      store: 86400,       // 24 hours
      user: 3600,         // 1 hour
      customer: 3600,     // 1 hour
      order: 300,         // 5 minutes (shorter TTL for dynamic data)
      cart: 300,          // 5 minutes (shorter TTL for dynamic data)
      payment: 300,       // 5 minutes (shorter TTL for sensitive data)
      refund: 300,        // 5 minutes (shorter TTL for sensitive data)
      return: 300,        // 5 minutes (shorter TTL for sensitive data)
      claim: 300,         // 5 minutes (shorter TTL for sensitive data)
      swap: 300,          // 5 minutes (shorter TTL for dynamic data)
      invite: 300,        // 5 minutes (shorter TTL for sensitive data)
      note: 300,          // 5 minutes (shorter TTL for dynamic data)
      notification: 300,  // 5 minutes (shorter TTL for dynamic data)
      return_reason: 3600 // 1 hour
    },
    // Expose Upstash REST credentials as custom fields for our custom loader only
    // @ts-ignore - custom property for Upstash REST client
    redisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
    // @ts-ignore - custom property for Upstash REST client
    redisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    http: {
      storeCors: process.env.STORE_CORS || "https://gomgom-bonbons.vercel.app,http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000",
      adminCors: process.env.ADMIN_CORS || "https://medusabackend-production-e0e9.up.railway.app,http://localhost:3000,http://localhost:5173,http://localhost:9000,https://gomgom-bonbons.vercel.app,http://127.0.0.1:3000",
      authCors: process.env.AUTH_CORS || "https://medusabackend-production-e0e9.up.railway.app,http://localhost:3000,http://localhost:5173,http://localhost:9000,https://gomgom-bonbons.vercel.app,http://127.0.0.1:3000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  plugins: [],
  modules: [
    // Redis-backed infrastructure modules
    {
      resolve: "@medusajs/event-bus-redis",
      key: Modules.EVENT_BUS,
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    // Locking module with Redis provider
    {
      resolve: "@medusajs/locking",
      key: Modules.LOCKING,
      options: {
        providers: [
          {
            resolve: "@medusajs/locking-redis",
            id: "redis",
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },
    // Workflow engine backed by Redis
    {
      resolve: "@medusajs/workflow-engine-redis",
      key: Modules.WORKFLOW_ENGINE,
      options: {
        redis: {
          url: process.env.REDIS_URL,
        },
      },
    },
    {
      resolve: "@medusajs/cache-redis",
      key: Modules.CACHE,
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/auth",
      key: Modules.AUTH,
      options: {
        providers: [
          { 
            resolve: "@medusajs/medusa/auth-emailpass", 
            id: "emailpass",
            options: {
              // Configuration pour les tokens de reset password
              resetPasswordTokenExpiry: 900, // 15 minutes en secondes
              resetPasswordTokenLength: 64   // Longueur du token pour plus de sécurité
            }
          }
        ],
      },
    },
    // Payment module with Stripe provider
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
    // Inventory module for stock management
    {
      resolve: "@medusajs/medusa/inventory",
      key: Modules.INVENTORY,
    },
    // File storage via Cloudflare R2 (S3-compatible)
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,          // <— IMPORTANT (public base URL)
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_client_config: {
                forcePathStyle: true, // requis/recommandé pour R2
              },
            },
          },
        ],
      },
    },
  ],
})
