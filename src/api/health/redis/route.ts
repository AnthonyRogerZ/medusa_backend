import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const scope = req.scope
  const result: any = {
    ioredis: {
      connected: false,
      error: null as null | string,
    },
    upstash_rest: {
      connected: false,
      error: null as null | string,
    },
  }

  // Test ioredis via the event-bus redis connection (already created by module loader)
  try {
    const eventBusRedisConnection = scope.resolve("eventBusRedisConnection") as any
    if (eventBusRedisConnection && typeof eventBusRedisConnection.ping === "function") {
      const pong = await eventBusRedisConnection.ping()
      result.ioredis.connected = pong === "PONG"
    } else {
      result.ioredis.error = "eventBusRedisConnection not available"
    }
  } catch (e: any) {
    result.ioredis.error = e?.message || String(e)
  }

  // Test Upstash REST via our custom redis service
  try {
    const redisService = scope.resolve("redis") as { getClient: () => any }
    const client = redisService?.getClient?.()
    if (client) {
      const key = "health:redis:rest"
      await client.set(key, "ok", { ex: 30 })
      const val = await client.get(key)
      result.upstash_rest.connected = val === "ok"
    } else {
      result.upstash_rest.error = "redis service not available"
    }
  } catch (e: any) {
    result.upstash_rest.error = e?.message || String(e)
  }

  res.json({
    ok: result.ioredis.connected || result.upstash_rest.connected,
    ...result,
  })
}
