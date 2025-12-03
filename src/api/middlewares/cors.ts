import { NextFunction, Request, Response } from "express"

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "https://gomgombonbons.com",
    "https://www.gomgombonbons.com",
    "https://medusabackend-production-e0e9.up.railway.app",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:5173",
    "http://localhost:9000"
  ]
  
  const origin = req.headers.origin
  
  // Toujours définir les en-têtes CORS
  if (allowedOrigins.includes(origin as string)) {
    res.header("Access-Control-Allow-Origin", origin)
  } else if (!origin) {
    // Pour les requêtes sans origin, utiliser le premier domaine autorisé
    res.header("Access-Control-Allow-Origin", allowedOrigins[0])
  }
  // Si origin non autorisée, on ne définit pas l'en-tête (silencieux)
  
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-medusa-access-token, x-publishable-api-key, x-fulfillment-token, Cookie, Set-Cookie")
  res.header("Access-Control-Expose-Headers", "Set-Cookie")
  
  // Gérer les requêtes preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  
  next()
}

export default corsMiddleware
