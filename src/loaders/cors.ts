import cors from "cors"

// Using a relaxed type to align with the runtime container shape that exposes `app`
export default async function ({ app }: any) {
  const origins = [
    "https://gomgom-bonbons.vercel.app",
    "http://localhost:3000",
  ]

  const corsOptions: cors.CorsOptions = {
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-publishable-api-key",
      "x-medusa-access-token",
      "Origin",
      "Accept",
    ],
    exposedHeaders: [
      "Set-Cookie",
    ],
    maxAge: 86400,
  }

  app.use(cors(corsOptions))
  app.options("*", cors(corsOptions))
}
