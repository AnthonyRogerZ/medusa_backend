import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

export default function corsMiddleware() {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    // Allowed origins: from env STORE_CORS if set, otherwise default to Vercel + localhost
    const allowed = (process.env.STORE_CORS || "https://gomgom-bonbons.vercel.app,http://localhost:3000")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)

    const requestOrigin = (req.headers["origin"] as string) || ""
    const allowAll = allowed.includes("*")
    
    // Debug log to see what's happening
    console.log(`[CORS] Origin: "${requestOrigin}", Allowed: [${allowed.join(", ")}], AllowAll: ${allowAll}`)
    
    if (allowAll) {
      // Wildcard allowed. Safe since we do not use cross-site cookies for Store API (publishable key only).
      res.header("Access-Control-Allow-Origin", "*")
    } else if (requestOrigin && allowed.includes(requestOrigin)) {
      res.header("Access-Control-Allow-Origin", requestOrigin)
    } else if (requestOrigin) {
      // For debugging: always allow the origin temporarily
      console.log(`[CORS] Allowing origin ${requestOrigin} for debugging`)
      res.header("Access-Control-Allow-Origin", requestOrigin)
    }

    res.header("Vary", "Origin")
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publishable-api-key, x-medusa-access-token"
    )
    res.header("Access-Control-Max-Age", "86400")

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.status(204).send()
    }

    next()
  }
}
