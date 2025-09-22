import { defineMiddlewares } from "@medusajs/medusa"
import corsMiddleware from "./middlewares/cors"
import compression from "compression"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Simple cache-control middleware for catalog endpoints
function cacheControl(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    if (req.method === "GET") {
      const p = req.path || ""
      // Skip caching for auth/session endpoints
      const isAuth = p.startsWith("/store/auth") || p.startsWith("/admin/auth")
      const isMe = p === "/store/me"

      if (!isAuth && !isMe) {
        // Broad cache for most store GET endpoints
        if (p.startsWith("/store/")) {
          // Default small TTL for first load acceleration
          res.setHeader(
            "Cache-Control",
            "public, max-age=30, s-maxage=180, stale-while-revalidate=300"
          )
        }

        // Stronger TTL for catalogue resources specifically
        if (
          p.startsWith("/store/products") ||
          p.startsWith("/store/collections")
        ) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
          )
        }
      }
    }
  } catch (e) {
    // no-op
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "*",
      middlewares: [compression(), cacheControl, corsMiddleware],
    },
  ],
})
