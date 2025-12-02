import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/customers/me
 * Override pour auto-lier les commandes guest au compte à chaque accès
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const logger = req.scope.resolve("logger") as any

  try {
    const customerId = (req as any).auth_context?.actor_id
    
    if (!customerId) {
      // Pas connecté, laisser Medusa gérer
      res.status(401).json({ message: "Not authenticated" })
      return
    }

    // Récupérer le customer
    const customerModuleService = req.scope.resolve("customer") as any
    const customer = await customerModuleService.retrieveCustomer(customerId, {
      relations: ["addresses"],
    })

    if (!customer) {
      res.status(404).json({ message: "Customer not found" })
      return
    }

    // Auto-link des commandes guest en arrière-plan (ne pas bloquer la réponse)
    autoLinkGuestOrders(req.scope, customerId, customer.email, logger).catch((e) => {
      logger.error(`[ME] Auto-link error: ${e?.message}`)
    })

    // Retourner le customer normalement
    res.status(200).json({ customer })

  } catch (error: any) {
    logger.error(`[ME] Error: ${error?.message}`)
    res.status(500).json({ message: "Internal error" })
  }
}

/**
 * Lie automatiquement les commandes guest au compte (silencieux)
 */
async function autoLinkGuestOrders(
  scope: any,
  customerId: string,
  email: string,
  logger: any
): Promise<void> {
  if (!email) return

  const emailLower = email.toLowerCase()
  
  try {
    const orderModuleService = scope.resolve("order") as any
    
    // Récupérer toutes les commandes
    const allOrders = await orderModuleService.listOrders(
      {},
      { select: ["id", "email", "customer_id", "display_id", "status", "canceled_at"], take: 500 }
    )

    // Filtrer les commandes guest avec cet email
    const guestOrders = (Array.isArray(allOrders) ? allOrders : []).filter((order: any) =>
      order &&
      order.email?.toLowerCase() === emailLower &&
      !order.customer_id &&
      !order.canceled_at &&
      order.status !== "canceled" &&
      order.status !== "archived"
    )

    if (guestOrders.length === 0) return

    logger.info(`[ME-AUTOLINK] Found ${guestOrders.length} guest orders to link for ${email}`)

    // Lier les commandes
    for (const order of guestOrders) {
      try {
        await orderModuleService.updateOrders(order.id, { customer_id: customerId })
        logger.info(`[ME-AUTOLINK] Linked order ${order.display_id} to customer ${customerId}`)
      } catch (e: any) {
        logger.error(`[ME-AUTOLINK] Failed to link order ${order.display_id}: ${e?.message}`)
      }
    }

  } catch (error: any) {
    // Silencieux - ne pas bloquer l'accès au compte
    logger.warn(`[ME-AUTOLINK] Error: ${error?.message}`)
  }
}
