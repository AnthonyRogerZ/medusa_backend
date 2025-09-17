import { defineMiddlewares } from "@medusajs/medusa"
import corsMiddleware from "./middlewares/cors"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      middlewares: [corsMiddleware],
    },
    {
      matcher: "/admin/*",
      middlewares: [corsMiddleware],
    },
  ],
})
