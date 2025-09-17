import cors from "cors"

// Early CORS loader: registers before anything else and short-circuits OPTIONS
export default async function ({ app }: any) {
  const allowedOrigins = [
    "https://gomgom-bonbons.vercel.app",
    "http://localhost:3000",
  ]

  const corsOptions: cors.CorsOptions = {
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-medusa-access-token",
      "Origin",
      "Accept",
    ],
    maxAge: 86400,
  }

  // Register CORS early
  app.use(cors(corsOptions))

  // Short-circuit preflight BEFORE any auth/publishable-key checks
  app.options("*", (req: any, res: any) => {
    const origin = req.headers.origin as string | undefined
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin)
      res.setHeader("Vary", "Origin")
      res.setHeader("Access-Control-Allow-Credentials", "true")
      res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
      res.setHeader(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"] ||
          "Content-Type,Authorization,x-medusa-access-token"
      )
    }
    res.status(204).end()
  })
}
