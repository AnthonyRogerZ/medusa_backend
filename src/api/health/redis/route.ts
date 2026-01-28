import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({
    ok: true,
    redis: {
      enabled: false,
      reason: "Redis is disabled; using in-memory modules",
    },
  })
}
