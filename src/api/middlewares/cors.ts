import { NextFunction, Request, Response } from "express"

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "https://gomgom-bonbons.vercel.app",
    "http://localhost:3000",
    "http://localhost:8000"
  ]
  
  const origin = req.headers.origin
  
  if (allowedOrigins.includes(origin as string)) {
    res.header("Access-Control-Allow-Origin", origin)
  }
  
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publishable-api-key")
  
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }
  
  next()
}

export default corsMiddleware
