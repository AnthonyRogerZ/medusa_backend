import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/customers/link-orders
 * Force la liaison des commandes guest au compte client connecté
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const logger = req.scope.resolve("logger") as any

  try {
    // Récupérer le customer connecté
    const customerId = (req as any).auth_context?.actor_id
    
    if (!customerId) {
      res.status(401).json({
        success: false,
        message: "Non authentifié",
      })
      return
    }

    // Récupérer les infos du customer
    const customerModuleService = req.scope.resolve("customer") as any
    const customer = await customerModuleService.retrieveCustomer(customerId)
    
    if (!customer?.email) {
      res.status(400).json({
        success: false,
        message: "Email du client non trouvé",
      })
      return
    }

    const emailLower = customer.email.toLowerCase()
    logger.info(`[LINK-ORDERS] Linking guest orders for ${emailLower} (customer ${customerId})`)

    // Récupérer toutes les commandes
    const orderModuleService = req.scope.resolve("order") as any
    
    let allOrders: any[] = []
    try {
      const result = await orderModuleService.listOrders(
        {},
        { select: ["id", "email", "customer_id", "display_id", "status", "canceled_at"], take: 1000 }
      )
      allOrders = Array.isArray(result) ? result : [result].filter(Boolean)
      logger.info(`[LINK-ORDERS] Found ${allOrders.length} total orders`)
    } catch (e: any) {
      logger.error(`[LINK-ORDERS] listOrders failed: ${e?.message}`)
    }

    // Filtrer par email (insensible à la casse) et sans customer_id
    const guestOrders = allOrders.filter((order: any) =>
      order &&
      order.email?.toLowerCase() === emailLower &&
      !order.customer_id &&
      !order.canceled_at &&
      order.status !== "canceled" &&
      order.status !== "archived"
    )

    logger.info(`[LINK-ORDERS] Guest orders to link: ${guestOrders.length}`)
    guestOrders.forEach((o: any) => {
      logger.info(`[LINK-ORDERS] Order ${o.display_id}: email=${o.email}, customer_id=${o.customer_id}`)
    })

    if (guestOrders.length === 0) {
      res.status(200).json({
        success: true,
        message: "Aucune commande guest à lier",
        linked_orders_count: 0,
      })
      return
    }

    // Lier les commandes
    let linkedCount = 0
    for (const order of guestOrders) {
      try {
        await orderModuleService.updateOrders(order.id, {
          customer_id: customerId,
        })
        logger.info(`[LINK-ORDERS] Linked order ${order.display_id} to customer ${customerId}`)
        linkedCount++
      } catch (e: any) {
        logger.error(`[LINK-ORDERS] Failed to link order ${order.display_id}: ${e?.message}`)
      }
    }

    res.status(200).json({
      success: true,
      message: `${linkedCount} commande(s) liée(s) à votre compte`,
      linked_orders_count: linkedCount,
    })

  } catch (error: any) {
    logger.error(`[LINK-ORDERS] Error: ${error?.message}`)
    res.status(500).json({
      success: false,
      message: "Erreur lors de la liaison des commandes",
    })
  }
}
