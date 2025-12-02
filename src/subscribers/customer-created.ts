import type { SubscriberArgs } from "@medusajs/framework"
import { CustomerWorkflowEvents } from "@medusajs/utils"

export const config = {
  event: CustomerWorkflowEvents.CREATED,
}

/**
 * Subscriber qui lie automatiquement les commandes guest (sans compte)
 * à un nouveau compte client créé avec le même email.
 * 
 * Cas d'usage: Un client commande en tant qu'invité, puis crée un compte
 * avec le même email. Ce subscriber retrouve ses commandes passées.
 */
export default async function handleCustomerCreated({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as { 
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void 
  }

  // L'événement customer.created envoie un tableau d'objets avec id
  const customers = event.data as { id: string }[] | { id: string }
  const customerList = Array.isArray(customers) ? customers : [customers]

  if (!customerList.length) {
    logger.warn("[CUSTOMER-CREATED] No customer data in event")
    return
  }

  const remoteQuery = container.resolve("remoteQuery") as any

  for (const customerData of customerList) {
    const customerId = customerData.id
    if (!customerId) continue

    try {
      // 1. Récupérer les infos du nouveau client (notamment son email)
      const customerResult = await remoteQuery({
        entryPoint: "customer",
        fields: ["id", "email"],
        variables: { id: customerId },
      })

      const customer = Array.isArray(customerResult) ? customerResult[0] : customerResult
      if (!customer?.email) {
        logger.warn(`[CUSTOMER-CREATED] Customer ${customerId} has no email`)
        continue
      }

      const email = customer.email.toLowerCase()
      logger.info(`[CUSTOMER-CREATED] New customer ${customerId} with email ${email}`)

      // 2. Chercher les commandes avec cet email mais sans customer_id (commandes guest)
      // Note: On utilise le Query de Medusa v2 avec les filtres appropriés
      let guestOrders: any[] = []
      
      try {
        // Méthode 1: Utiliser le module order directement pour plus de contrôle
        const orderModuleService = container.resolve("order") as any
        
        // Récupérer toutes les commandes avec cet email
        const ordersResult = await orderModuleService.listOrders(
          { email: email },
          { select: ["id", "email", "customer_id", "display_id"] }
        )
        
        const orders = Array.isArray(ordersResult) ? ordersResult : [ordersResult].filter(Boolean)
        
        // Filtrer les commandes qui n'ont pas de customer_id (commandes guest)
        guestOrders = orders.filter((order: any) => 
          order && 
          order.email?.toLowerCase() === email && 
          !order.customer_id
        )
      } catch (listError: any) {
        logger.warn(`[CUSTOMER-CREATED] listOrders failed, trying remoteQuery: ${listError?.message}`)
        
        // Méthode 2: Fallback avec remoteQuery
        const ordersResult = await remoteQuery({
          entryPoint: "order",
          fields: ["id", "email", "customer_id", "display_id"],
          variables: {
            filters: {
              email: email,
            },
          },
        })

        const orders = Array.isArray(ordersResult) ? ordersResult : [ordersResult].filter(Boolean)
        
        guestOrders = orders.filter((order: any) => 
          order && 
          order.email?.toLowerCase() === email && 
          !order.customer_id
        )
      }

      if (guestOrders.length === 0) {
        logger.info(`[CUSTOMER-CREATED] No guest orders found for email ${email}`)
        continue
      }

      logger.info(`[CUSTOMER-CREATED] Found ${guestOrders.length} guest orders to link for ${email}`)

      // 3. Mettre à jour chaque commande guest avec le customer_id
      const orderService = container.resolve("order") as any

      for (const order of guestOrders) {
        try {
          await orderService.updateOrders(order.id, {
            customer_id: customerId,
          })
          logger.info(`[CUSTOMER-CREATED] Linked order ${order.display_id || order.id} to customer ${customerId}`)
        } catch (updateError: any) {
          logger.error(`[CUSTOMER-CREATED] Failed to link order ${order.id}: ${updateError?.message || updateError}`)
        }
      }

      logger.info(`[CUSTOMER-CREATED] Successfully processed ${guestOrders.length} orders for customer ${customerId}`)

    } catch (error: any) {
      logger.error(`[CUSTOMER-CREATED] Error processing customer ${customerId}: ${error?.message || error}`)
    }
  }
}
