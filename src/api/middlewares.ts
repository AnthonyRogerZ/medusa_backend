import { defineMiddlewares } from "@medusajs/medusa"
import corsMiddleware from "./middlewares/cors"

export default defineMiddlewares({
  routes: [
    {
      matcher: "*",
      middlewares: [corsMiddleware],
    },
  ],
})
