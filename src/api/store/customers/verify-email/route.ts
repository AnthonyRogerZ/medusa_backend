import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hashToken, isTokenExpired } from "../../../../lib/email-verification"

/**
 * POST /store/customers/verify-email
 * 
 * Vérifie l'email d'un client avec le token reçu par email.
 * Une fois vérifié, les commandes guest avec le même email seront liées au compte.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") as any
  
  try {
    const { token, customer_id } = req.body as { token?: string; customer_id?: string }

    if (!token || !customer_id) {
      return res.status(400).json({
        success: false,
        message: "Token et customer_id requis",
      })
    }

    const remoteQuery = req.scope.resolve("remoteQuery") as any
    const customerModuleService = req.scope.resolve("customer") as any

    // 1. Récupérer le customer
    const customerResult = await remoteQuery({
      entryPoint: "customer",
      fields: ["id", "email", "metadata"],
      variables: { id: customer_id },
    })

    const customer = Array.isArray(customerResult) ? customerResult[0] : customerResult
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Client non trouvé",
      })
    }

    // 2. Vérifier si déjà vérifié
    if (customer.metadata?.email_verified === true) {
      return res.status(200).json({
        success: true,
        message: "Email déjà vérifié",
        already_verified: true,
      })
    }

    // 3. Vérifier le token
    const verification = customer.metadata?.email_verification
    if (!verification?.token_hash || !verification?.created_at) {
      return res.status(400).json({
        success: false,
        message: "Aucune vérification en attente pour ce compte",
      })
    }

    // Vérifier l'expiration
    if (isTokenExpired(new Date(verification.created_at))) {
      return res.status(400).json({
        success: false,
        message: "Le lien de vérification a expiré. Veuillez demander un nouveau lien.",
        expired: true,
      })
    }

    // Vérifier le token
    const hashedToken = hashToken(token)
    if (hashedToken !== verification.token_hash) {
      return res.status(400).json({
        success: false,
        message: "Token de vérification invalide",
      })
    }

    // 4. Marquer l'email comme vérifié
    await customerModuleService.updateCustomers(customer_id, {
      metadata: {
        ...customer.metadata,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        email_verification: undefined, // Supprimer le token
      },
    })

    logger.info(`[VERIFY-EMAIL] Email verified for customer ${customer_id}`)

    // 5. Lier les commandes guest avec le même email
    const linkedOrders = await linkGuestOrders(req.scope, customer_id, customer.email, logger)

    return res.status(200).json({
      success: true,
      message: "Email vérifié avec succès",
      linked_orders_count: linkedOrders,
    })

  } catch (error: any) {
    logger.error(`[VERIFY-EMAIL] Error: ${error?.message || error}`)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification",
    })
  }
}

/**
 * Lie les commandes guest (sans customer_id) au compte vérifié
 */
async function linkGuestOrders(
  scope: any,
  customerId: string,
  email: string,
  logger: any
): Promise<number> {
  try {
    const orderModuleService = scope.resolve("order") as any
    const emailLower = email.toLowerCase()

    logger.info(`[VERIFY-EMAIL] Looking for guest orders with email: ${emailLower}`)

    // Récupérer les commandes - essayer avec l'email original ET en minuscules
    let ordersResult: any[] = []
    
    try {
      // Essayer d'abord avec l'email en minuscules
      const result1 = await orderModuleService.listOrders(
        { email: emailLower },
        { select: ["id", "email", "customer_id", "display_id", "status", "canceled_at"] }
      )
      ordersResult = Array.isArray(result1) ? result1 : [result1].filter(Boolean)
      logger.info(`[VERIFY-EMAIL] Found ${ordersResult.length} orders with lowercase email`)
    } catch (e) {
      logger.warn(`[VERIFY-EMAIL] listOrders with lowercase failed`)
    }

    // Si pas de résultats, essayer avec l'email original
    if (ordersResult.length === 0 && email !== emailLower) {
      try {
        const result2 = await orderModuleService.listOrders(
          { email: email },
          { select: ["id", "email", "customer_id", "display_id", "status", "canceled_at"] }
        )
        const orders2 = Array.isArray(result2) ? result2 : [result2].filter(Boolean)
        ordersResult = [...ordersResult, ...orders2]
        logger.info(`[VERIFY-EMAIL] Found ${orders2.length} orders with original email`)
      } catch (e) {
        logger.warn(`[VERIFY-EMAIL] listOrders with original email failed`)
      }
    }

    // Dédupliquer par ID
    const uniqueOrders = ordersResult.filter((order, index, self) =>
      index === self.findIndex((o) => o.id === order.id)
    )

    logger.info(`[VERIFY-EMAIL] Total unique orders found: ${uniqueOrders.length}`)
    uniqueOrders.forEach((o: any) => {
      logger.info(`[VERIFY-EMAIL] Order ${o.display_id}: email=${o.email}, customer_id=${o.customer_id}, status=${o.status}`)
    })

    // Filtrer les commandes guest (sans customer_id) et non annulées
    const guestOrders = uniqueOrders.filter((order: any) =>
      order &&
      order.email?.toLowerCase() === emailLower &&
      !order.customer_id &&
      !order.canceled_at && // Exclure les commandes annulées
      order.status !== "canceled" && // Exclure par statut aussi
      order.status !== "archived" // Exclure les archivées
    )

    logger.info(`[VERIFY-EMAIL] Guest orders to link: ${guestOrders.length}`)

    if (guestOrders.length === 0) {
      logger.info(`[VERIFY-EMAIL] No guest orders to link for ${email}`)
      return 0
    }

    // Lier chaque commande
    let linkedCount = 0
    for (const order of guestOrders) {
      try {
        await orderModuleService.updateOrders(order.id, {
          customer_id: customerId,
        })
        logger.info(`[VERIFY-EMAIL] Linked order ${order.display_id || order.id} to customer ${customerId}`)
        linkedCount++
      } catch (updateError: any) {
        logger.error(`[VERIFY-EMAIL] Failed to link order ${order.id}: ${updateError?.message}`)
      }
    }

    logger.info(`[VERIFY-EMAIL] Linked ${linkedCount} orders to customer ${customerId}`)
    return linkedCount

  } catch (error: any) {
    logger.error(`[VERIFY-EMAIL] Error linking orders: ${error?.message}`)
    return 0
  }
}

/**
 * GET /store/customers/verify-email
 * 
 * Permet de vérifier via un lien GET (pour les emails)
 * Redirige vers le frontend avec le résultat
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") as any
  const frontendUrl = process.env.FRONTEND_URL || "https://gomgom-bonbons.vercel.app"
  
  try {
    const token = req.query.token as string
    const customer_id = req.query.customer_id as string

    if (!token || !customer_id) {
      return res.redirect(`${frontendUrl}/verify-email?error=missing_params`)
    }

    const remoteQuery = req.scope.resolve("remoteQuery") as any
    const customerModuleService = req.scope.resolve("customer") as any

    // Récupérer le customer
    const customerResult = await remoteQuery({
      entryPoint: "customer",
      fields: ["id", "email", "metadata"],
      variables: { id: customer_id },
    })

    const customer = Array.isArray(customerResult) ? customerResult[0] : customerResult
    if (!customer) {
      return res.redirect(`${frontendUrl}/verify-email?error=not_found`)
    }

    // Vérifier si déjà vérifié
    if (customer.metadata?.email_verified === true) {
      return res.redirect(`${frontendUrl}/verify-email?success=already_verified`)
    }

    // Vérifier le token
    const verification = customer.metadata?.email_verification
    if (!verification?.token_hash || !verification?.created_at) {
      return res.redirect(`${frontendUrl}/verify-email?error=no_pending`)
    }

    if (isTokenExpired(new Date(verification.created_at))) {
      return res.redirect(`${frontendUrl}/verify-email?error=expired`)
    }

    const hashedToken = hashToken(token)
    if (hashedToken !== verification.token_hash) {
      return res.redirect(`${frontendUrl}/verify-email?error=invalid_token`)
    }

    // Marquer comme vérifié
    await customerModuleService.updateCustomers(customer_id, {
      metadata: {
        ...customer.metadata,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        email_verification: undefined,
      },
    })

    logger.info(`[VERIFY-EMAIL] Email verified via GET for customer ${customer_id}`)

    // Lier les commandes guest
    await linkGuestOrders(req.scope, customer_id, customer.email, logger)

    return res.redirect(`${frontendUrl}/verify-email?success=verified`)

  } catch (error: any) {
    logger.error(`[VERIFY-EMAIL] GET Error: ${error?.message || error}`)
    return res.redirect(`${frontendUrl}/verify-email?error=server_error`)
  }
}
