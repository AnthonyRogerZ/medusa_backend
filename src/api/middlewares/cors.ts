import { NextFunction, Request, Response } from "express"

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "https://gomgom-bonbons.vercel.app",
    "http://localhost:3000",
    "http://localhost:8000"
  ]
  
  const origin = req.headers.origin
  
  // Debug logs pour diagnostiquer le problème
  if (req.path === "/store/me") {
    console.log(`[CORS DEBUG] ${req.method} ${req.path} - Origin: ${origin}`)
    console.log(`[CORS DEBUG] Allowed origins:`, allowedOrigins)
  }
  
  // Toujours définir les en-têtes CORS
  if (allowedOrigins.includes(origin as string)) {
    res.header("Access-Control-Allow-Origin", origin)
    if (req.path === "/store/me") {
      console.log(`[CORS DEBUG] Setting origin to: ${origin}`)
    }
  } else if (!origin) {
    // Pour les requêtes sans origin (comme les requêtes serveur-à-serveur)
    res.header("Access-Control-Allow-Origin", "*")
  }
  
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publishable-api-key, Cookie, Set-Cookie")
  res.header("Access-Control-Expose-Headers", "Set-Cookie")
  
  // Gérer les requêtes preflight OPTIONS
  if (req.method === "OPTIONS") {
    if (req.path === "/store/me") {
      console.log(`[CORS DEBUG] Handling OPTIONS preflight for /store/me`)
    }
    return res.status(200).end()
  }
  
  next()
}

export default corsMiddleware
