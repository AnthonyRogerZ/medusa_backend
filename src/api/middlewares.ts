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
  const logger = req.scope.resolve("logger") as any
  logger.info(`[AUTOLINK] Middleware triggered for ${req.path}`)
  
  try {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) {
      logger.info(`[AUTOLINK] No customer ID, skipping`)
      return
    }

    logger.info(`[AUTOLINK] Customer ID: ${customerId}`)
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

    logger.info(`[AUTOLINK] Total orders: ${allOrders.length}, Guest orders for ${emailLower}: ${guestOrders.length}`)
    
    // Log TOUTES les commandes pour debug (limité aux 20 dernières)
    const recentOrders = (Array.isArray(allOrders) ? allOrders : []).slice(-20)
    recentOrders.forEach((o: any) => {
      logger.info(`[AUTOLINK] Order ${o.display_id}: email=${o.email}, customer_id=${o.customer_id || 'NULL'}`)
    })

    if (guestOrders.length === 0) {
      logger.info(`[AUTOLINK] No guest orders to link`)
      return
    }

    logger.info(`[AUTOLINK] Found ${guestOrders.length} guest orders to link for ${customer.email}`)

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
