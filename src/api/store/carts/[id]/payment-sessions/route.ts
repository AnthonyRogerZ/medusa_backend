import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Désactive l'authentification pour le preflight OPTIONS seul
// (les requêtes POST réelles continueront d'exiger x-publishable-api-key)
export const AUTHENTICATE = false

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  const origin = req.headers.origin as string | undefined
  const allowedOrigins = [
    "https://gomgom-bonbons.vercel.app",
    "http://localhost:3000",
  ]

  // Répondre avec les en-têtes CORS requis
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  }
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  )
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,x-publishable-api-key,x-medusa-access-token,Origin,Accept"
  )
  res.setHeader("Access-Control-Max-Age", "86400")

  return res.status(204).end()
}
