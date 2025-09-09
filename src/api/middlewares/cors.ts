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
    if (allowAll) {
      // Wildcard allowed. Safe since we do not use cross-site cookies for Store API (publishable key only).
      res.header("Access-Control-Allow-Origin", "*")
    } else if (requestOrigin && allowed.includes(requestOrigin)) {
      res.header("Access-Control-Allow-Origin", requestOrigin)
      // Only set credentials header if you actually use cookies across origins. Frontend uses API key, so omit.
      // res.header("Access-Control-Allow-Credentials", "true")
    }

    res.header("Vary", "Origin")
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publishable-api-key"
    )

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.status(204).send()
    }

    next()
  }
}
