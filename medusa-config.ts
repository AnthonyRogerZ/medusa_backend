import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())


module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // IMPORTANT: This must be a Redis protocol URL (e.g., rediss://:password@host:port)
    // Prefer REDIS_URL (Railway/Upstash Redis TLS) or fallback to UPSTASH_REDIS_URL
    redisUrl: process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL,
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
        providers: [{ resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" }],
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
