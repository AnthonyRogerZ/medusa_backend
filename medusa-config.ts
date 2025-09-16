import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Determine whether to enable Stripe safely
const STRIPE_API_KEY = process.env.STRIPE_API_KEY?.trim()
const STRIPE_ENABLED = (process.env.STRIPE_ENABLED ?? 'true').toLowerCase() !== 'false'
const ENABLE_STRIPE = !!STRIPE_API_KEY && STRIPE_ENABLED

// TEMP: Debug logs to validate env in production (safe masked output)
try {
  const prefix = STRIPE_API_KEY ? STRIPE_API_KEY.slice(0, 7) : 'undefined'
  // eslint-disable-next-line no-console
  console.log(
    `[config] Stripe enabled=${ENABLE_STRIPE} | keyPresent=${!!STRIPE_API_KEY} | keyPrefix=${prefix}`
  )
} catch {}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "https://gomgom-bonbons.vercel.app,http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001",
      authCors: process.env.AUTH_CORS || "https://gomgom-bonbons.vercel.app,http://localhost:3000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      key: Modules.AUTH,
      options: {
        providers: [{ resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" }],
      },
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
    // Payments: Stripe - Always register the module
    {
      resolve: "@medusajs/medusa/payment",
      key: Modules.PAYMENT,
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  ],
})
