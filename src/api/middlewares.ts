import { defineMiddlewares } from "@medusajs/medusa"
import corsMiddleware from "./middlewares/cors"
import compression from "compression"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Auto-link guest orders middleware - s'exécute sur /store/customers/me
async function autoLinkGuestOrdersMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Exécuter le handler original d'abord
  next()
  
  // Puis faire l'auto-link en arrière-plan (après la réponse)
  try {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return

    const logger = req.scope.resolve("logger") as any
    const customerModuleService = req.scope.resolve("customer") as any
    const orderModuleService = req.scope.resolve("order") as any

    const customer = await customerModuleService.retrieveCustomer(customerId)
    if (!customer?.email) return

    const emailLower = customer.email.toLowerCase()

    // Récupérer les commandes guest
    const allOrders = await orderModuleService.listOrders(
      {},
      { select: ["id", "email", "customer_id", "display_id", "status", "canceled_at"], take: 500 }
    )

    // Trouver les commandes avec cet email qui ne sont PAS liées à CE customer
    // (inclut les guest ET les commandes liées à d'autres customers "ghost" avec le même email)
    const ordersToLink = (Array.isArray(allOrders) ? allOrders : []).filter((order: any) =>
      order &&
      order.email?.toLowerCase() === emailLower &&
      order.customer_id !== customerId && // Pas déjà lié à ce compte
      !order.canceled_at &&
      order.status !== "canceled" &&
      order.status !== "archived"
    )
    
    // Pour compatibilité avec le reste du code
    const guestOrders = ordersToLink

    if (guestOrders.length === 0) return

    logger.info(`[AUTOLINK] Linking ${guestOrders.length} orders to customer ${customerId}`)

    for (const order of guestOrders) {
      try {
        await orderModuleService.updateOrders(order.id, { customer_id: customerId })
        logger.info(`[AUTOLINK] Linked order ${order.display_id} to customer ${customerId}`)
      } catch (e: any) {
        logger.error(`[AUTOLINK] Failed: ${e?.message}`)
      }
    }
  } catch (e) {
    // Silencieux
  }
}

// Simple cache-control middleware for catalog endpoints
function cacheControl(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    if (req.method === "GET") {
      const p = req.path || ""
      // Skip caching for auth/session endpoints
      const isAuth = p.startsWith("/store/auth") || p.startsWith("/admin/auth")
      const isMe = p === "/store/me"

      if (!isAuth && !isMe) {
        // Broad cache for most store GET endpoints
        if (p.startsWith("/store/")) {
          // Default small TTL for first load acceleration
          res.setHeader(
            "Cache-Control",
            "public, max-age=30, s-maxage=180, stale-while-revalidate=300"
          )
        }

        // Stronger TTL for catalogue resources specifically
        if (
          p.startsWith("/store/products") ||
          p.startsWith("/store/collections")
        ) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
          )
        }
      }
    }
  } catch (e) {
    // no-op
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "*",
      middlewares: [compression(), cacheControl, corsMiddleware],
    },
    {
      matcher: "/store/customers/me",
      middlewares: [autoLinkGuestOrdersMiddleware],
    },
  ],
})
