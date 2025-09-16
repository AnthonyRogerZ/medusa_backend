import { defineMiddlewares } from "@medusajs/framework/http"
import corsMiddleware from "./middlewares/cors"

// Register CORS middleware for all routes (store + admin + auth, etc.)
export default defineMiddlewares({
  routes: [
    {
      matcher: /.*/,
      middlewares: [corsMiddleware()],
    },
  ],
})
