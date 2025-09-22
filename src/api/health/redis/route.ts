import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Simple in-memory throttle to reduce Redis commands
let lastResult: any | null = null
let lastCheckedAt = 0
let lastRestWriteAt = 0

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query?.force
  const force = typeof q === "string" ? q === "1" : Array.isArray(q) ? q.includes("1") : false
  const now = Date.now()

  if (!force && lastResult && now - lastCheckedAt < 60_000) {
    return res.json(lastResult)
  }

  const scope = req.scope
  const result: any = {
    ok: false,
    ioredis: {
      connected: false,
      error: null as null | string,
    },
    upstash_rest: {
      connected: false,
      error: null as null | string,
    },
    cached_for_seconds: 60,
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

  // Test Upstash REST via our custom redis service — prefer GET-only; avoid writes unless needed
  try {
    const redisService = scope.resolve("redis") as { getClient: () => any }
    const client = redisService?.getClient?.()
    if (client) {
      const key = "health:redis:rest"
      let val: string | null = null
      try {
        val = await client.get(key)
      } catch {}
      if (val !== "ok" && (force || now - lastRestWriteAt > 10 * 60_000)) {
        // Write at most every 10 minutes unless force=1
        await client.set(key, "ok", { ex: 120 })
        lastRestWriteAt = now
        val = await client.get(key)
      }
      result.upstash_rest.connected = val === "ok"
    } else {
      result.upstash_rest.error = "redis service not available"
    }
  } catch (e: any) {
    result.upstash_rest.error = e?.message || String(e)
  }

  result.ok = result.ioredis.connected || result.upstash_rest.connected
  lastResult = result
  lastCheckedAt = now

  res.json(result)
}
