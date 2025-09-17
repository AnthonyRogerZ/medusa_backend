import { defineMiddlewares } from "@medusajs/medusa"
import corsMiddleware from "./middlewares/cors"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/carts/*/payment-sessions",
      middlewares: [corsMiddleware],
    },
    {
      matcher: "/store/carts/*/payment-session",
      middlewares: [corsMiddleware],
    },
  ],
})
