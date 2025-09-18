import { NextFunction, Request, Response } from "express"

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "https://gomgom-bonbons.vercel.app",
    "https://medusabackend-production-e0e9.up.railway.app",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:5173",
    "http://localhost:9000"
  ]
  
  const origin = req.headers.origin
  
  // Debug logs pour diagnostiquer le problème
  if (req.path.includes("/store/me") || req.path.includes("/store/customers")) {
    console.log(`[CORS DEBUG] ${req.method} ${req.path} - Origin: ${origin}`)
    console.log(`[CORS DEBUG] Allowed origins:`, allowedOrigins)
    console.log(`[CORS DEBUG] Full URL:`, req.url)
  }
  
  // Toujours définir les en-têtes CORS
  if (allowedOrigins.includes(origin as string)) {
    res.header("Access-Control-Allow-Origin", origin)
    if (req.path === "/store/me") {
      console.log(`[CORS DEBUG] Setting origin to: ${origin}`)
    }
  } else if (!origin) {
    // Pour les requêtes sans origin, utiliser le premier domaine autorisé au lieu de *
    // car * ne fonctionne pas avec Access-Control-Allow-Credentials: true
    res.header("Access-Control-Allow-Origin", allowedOrigins[0])
  } else {
    // Origin non autorisée, ne pas définir d'en-tête CORS
    console.log(`[CORS DEBUG] Origin non autorisée: ${origin}`)
  }
  
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-medusa-access-token, Cookie, Set-Cookie")
  res.header("Access-Control-Expose-Headers", "Set-Cookie")
  
  // Gérer les requêtes preflight OPTIONS
  if (req.method === "OPTIONS") {
    if (req.path.includes("/store/me") || req.path.includes("/store/customers")) {
      console.log(`[CORS DEBUG] Handling OPTIONS preflight for ${req.path}`)
    }
    return res.status(200).end()
  }
  
  next()
}

export default corsMiddleware
