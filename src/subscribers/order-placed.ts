import type { SubscriberArgs } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/utils"
import { sendMailjetEmail } from "../lib/email/mailjet"
import { sendOrderNotificationToSlack } from "../lib/slack/notifications"

type Logger = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

type Container = {
  resolve: <T = unknown>(key: string) => T
}

type OrderItem = {
  title?: string
  quantity?: number
  total?: number
  variant?: { weight?: number }
}

type ShippingAddress = {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
  phone?: string
}

type ShippingMethod = {
  name?: string
  amount?: number
}

type RelayPoint = {
  id: string
  name: string
  address: string
  postalCode: string
  city: string
  country?: string
}

type OrderRecord = {
  id: string
  display_id?: string
  email?: string
  currency_code: string
  total: number
  subtotal: number
  shipping_total: number
  tax_total?: number
  cart_id?: string
  customer_id?: string
  metadata?: { relay_point?: RelayPoint; order_notes?: string }
  items?: OrderItem[]
  shipping_address?: ShippingAddress
  shipping_methods?: ShippingMethod[]
}

type PromotionService = {
  listCampaigns: (
    filter: Record<string, unknown>,
    config?: { select?: string[]; take?: number }
  ) => Promise<Array<{ id: string; name?: string }>>
  createCampaigns: (data: { name: string; campaign_identifier: string; budget: { type: string; limit: number } }) => Promise<{ id: string }>
  createPromotions: (data: Record<string, unknown>) => Promise<{ id?: string }>
}

type CustomerService = {
  listCustomers: (
    filter: { email: string },
    config?: { select?: string[] }
  ) => Promise<Array<{ id: string; email?: string; metadata?: Record<string, unknown> }>>
}

type OrderService = {
  updateOrders: (id: string, data: { customer_id: string }) => Promise<unknown>
}

type RemoteQuery = (query: {
  entryPoint: string
  fields: string[]
  variables: { id: string }
}) => Promise<OrderRecord | OrderRecord[]>

type EmailTemplateInput = {
  order: OrderRecord
  firstOrderPromoCode: string | null
  orderUrl: string
}

const formatAmount = (amount?: number, currency?: string) => {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: (currency || "EUR").toUpperCase(),
    }).format(amount || 0)
  } catch {
    return `${amount || 0} ${currency || "EUR"}`
  }
}

const buildOrderLines = (items: OrderItem[], currency: string) =>
  items
    .map(
      (it) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 15px 10px;">
            <div style="font-weight: 500; color: #000;">${it.title}</div>
            <div style="font-size: 13px; color: #666;">Quantité: ${it.quantity}</div>
          </td>
          <td style="padding: 15px 10px; text-align: right; font-weight: 500; color: #000;">
            ${formatAmount(it.total, currency)}
          </td>
        </tr>`
    )
    .join("")

const buildAddressHtml = (
  shippingAddr?: ShippingAddress,
  relayPoint?: RelayPoint,
  shippingMethodName?: string
) => {
  const normalizedMethod = shippingMethodName?.toLowerCase() || ""
  const isMondialRelay = normalizedMethod.includes("mondial")
  const isChronopost = normalizedMethod.includes("chronopost") || normalizedMethod.includes("chrono")
  const isRelayPoint = (isMondialRelay || isChronopost) && relayPoint

  if (isRelayPoint && relayPoint) {
    return `
      <div style="background: ${isChronopost ? "#e3f2fd" : "#fff5e6"}; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${isChronopost ? "#1976d2" : "#ff9800"};">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: ${isChronopost ? "#1565c0" : "#e65100"};">${isChronopost ? "⚡" : "📮"} Point ${isChronopost ? "Chronopost" : "Relais"} de livraison</h3>
        <p style="margin: 5px 0; color: #333; line-height: 1.6;">
          <strong style="color: ${isChronopost ? "#1565c0" : "#e65100"};">${relayPoint.name}</strong><br>
          ${relayPoint.address}<br>
          ${relayPoint.postalCode} ${relayPoint.city}
        </p>
        ${shippingAddr?.phone ? `<p style="margin: 10px 0 0 0; color: #666;">📞 ${shippingAddr.phone}</p>` : ""}
      </div>
    `
  }

  if (!shippingAddr) {
    return ""
  }

  return `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #000;">📍 Adresse de livraison</h3>
        <p style="margin: 5px 0; color: #333; line-height: 1.6;">
          <strong>${shippingAddr.first_name} ${shippingAddr.last_name}</strong><br>
          ${shippingAddr.address_1}<br>
          ${shippingAddr.address_2 ? `${shippingAddr.address_2}<br>` : ""}
          ${shippingAddr.postal_code} ${shippingAddr.city}<br>
          ${shippingAddr.province ? `${shippingAddr.province}<br>` : ""}
          ${shippingAddr.phone ? `📞 ${shippingAddr.phone}` : ""}
        </p>
      </div>
  `
}

const buildOrderNotesHtml = (notes?: string) =>
  notes
    ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #856404; font-size: 14px;">
          📝 Instructions spéciales
        </p>
        <p style="margin: 0; color: #856404; line-height: 1.6;">
          ${String(notes).replace(/\n/g, "<br>")}
        </p>
      </div>
      `
    : ""

const buildOrderEmailHtml = ({ order, firstOrderPromoCode, orderUrl }: EmailTemplateInput) => {
  const shippingAddr = order.shipping_address
  const relayPoint = order.metadata?.relay_point
  const lines = buildOrderLines(order.items ?? [], order.currency_code)
  const addressHtml = buildAddressHtml(shippingAddr, relayPoint, order.shipping_methods?.[0]?.name)
  const orderNotesHtml = buildOrderNotesHtml(order.metadata?.order_notes)

  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #FFB6C1 0%, #98D8C8 100%); padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; color: #000; font-size: 28px;">🎉 Commande Confirmée !</h1>
          <p style="margin: 10px 0 0 0; color: #333; font-size: 16px;">
            Merci pour votre confiance
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Bonjour <strong>${shippingAddr?.first_name || "cher client"}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Nous avons bien reçu votre commande <strong>#${order.display_id || order.id}</strong> 
            et nous la préparons avec soin ! 🍬
          </p>

          ${orderNotesHtml}

          <!-- Order Items -->
          <div style="margin: 30px 0;">
            <h2 style="font-size: 18px; color: #000; margin: 0 0 20px 0; border-bottom: 2px solid #FFB6C1; padding-bottom: 10px;">
              📦 Votre commande
            </h2>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
              <tbody>
                ${lines}
              </tbody>
              <tfoot>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 15px 10px; text-align: right; color: #666;">Sous-total</td>
                  <td style="padding: 15px 10px; text-align: right; color: #666;">${formatAmount(order.subtotal, order.currency_code)}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 15px 10px; text-align: right; color: #666;">Livraison</td>
                  <td style="padding: 15px 10px; text-align: right; color: #666;">${formatAmount(order.shipping_total, order.currency_code)}</td>
                </tr>
                <tr style="background: #FFB6C1;">
                  <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #000; font-size: 18px;">Total</td>
                  <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #000; font-size: 18px;">${formatAmount(order.total, order.currency_code)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${addressHtml}
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${orderUrl}" 
               style="display: inline-block; background: #000; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              📱 Suivre ma commande
            </a>
          </div>
          
          <!-- Info Box -->
          <div style="background: #e8f5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <p style="margin: 0; color: #2e7d32; line-height: 1.6; font-size: 14px;">
              <strong>✨ Prochaines étapes :</strong><br>
              • Votre commande est en cours de préparation<br>
              • Vous recevrez un email dès l'expédition avec votre numéro de suivi<br>
              • Livraison estimée sous 2-4 jours ouvrés
            </p>
          </div>
          
          ${firstOrderPromoCode ? `
          <!-- Code Promo Première Commande -->
          <div style="background: linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              🎁 Cadeau de bienvenue
            </p>
            <p style="margin: 0 0 15px 0; color: #fff; font-size: 18px; font-weight: bold;">
              Merci pour votre première commande !
            </p>
            <div style="background: #fff; border-radius: 8px; padding: 15px; display: inline-block; margin: 10px 0;">
              <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">Votre code promo personnel</p>
              <p style="margin: 0; color: #C4668A; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                ${firstOrderPromoCode}
              </p>
            </div>
            <p style="margin: 15px 0 0 0; color: #fff; font-size: 16px;">
              <strong>-10%</strong> sur votre prochaine commande
            </p>
            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">
              Code à usage unique • Sans minimum d'achat
            </p>
          </div>
          ` : ""}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <!-- Footer -->
          <p style="font-size: 14px; color: #999; text-align: center; line-height: 1.8;">
            Des questions ? Répondez simplement à cet email<br>
            <strong style="color: #FFB6C1;">Merci pour votre confiance !</strong><br>
            L'équipe GomGom Bonbons 🍬
          </p>
        </div>
      </div>
      `
}

const buildOrderEmailText = ({ order, firstOrderPromoCode, orderUrl }: EmailTemplateInput) => {
  const shippingAddr = order.shipping_address
  const relayPoint = order.metadata?.relay_point
  const shippingMethodName = order.shipping_methods?.[0]?.name?.toLowerCase() || ""
  const isMondialRelay = shippingMethodName.includes("mondial")
  const isChronopost = shippingMethodName.includes("chronopost") || shippingMethodName.includes("chrono")
  const isRelayPoint = (isMondialRelay || isChronopost) && relayPoint

  return `
Commande Confirmée !

Bonjour ${shippingAddr?.first_name || "cher client"},

Nous avons bien reçu votre commande #${order.display_id || order.id}.

Articles:
${(order.items ?? []).map((it) => `- ${it.title} x${it.quantity} - ${formatAmount(it.total, order.currency_code)}`).join("\n")}

Sous-total: ${formatAmount(order.subtotal, order.currency_code)}
Livraison: ${formatAmount(order.shipping_total, order.currency_code)}
Total: ${formatAmount(order.total, order.currency_code)}

${isRelayPoint && relayPoint ? `
Point ${isChronopost ? "Chronopost" : "Relais"} de livraison:
${relayPoint.name}
${relayPoint.address}
${relayPoint.postalCode} ${relayPoint.city}
` : (shippingAddr ? `
Adresse de livraison:
${shippingAddr.first_name} ${shippingAddr.last_name}
${shippingAddr.address_1}
${shippingAddr.postal_code} ${shippingAddr.city}
` : "")}

${order.metadata?.order_notes ? `Instructions spéciales: ${order.metadata.order_notes}\n` : ""}
${firstOrderPromoCode ? `
🎁 CADEAU DE BIENVENUE
Merci pour votre première commande !
Votre code promo personnel: ${firstOrderPromoCode}
-10% sur votre prochaine commande
Code à usage unique • Sans minimum d'achat
` : ""}
Suivre ma commande: ${orderUrl}

Merci pour votre confiance !
L'équipe GomGom Bonbons
      `.trim()
}

/**
 * Génère un code promo unique pour les nouveaux clients (1ère commande)
 * Le code donne 10% de réduction et n'est utilisable qu'une seule fois
 */
async function generateFirstOrderPromoCode(
  container: Container,
  order: OrderRecord,
  logger: Logger
): Promise<string | null> {
  const customerEmail = order.email?.toLowerCase()
  if (!customerEmail) {
    logger.info(`[PROMO] No email for order ${order.display_id}, skipping promo code`)
    return null
  }

  try {
    const promotionModuleService = container.resolve<PromotionService>("promotion")
    
    // Vérifier si une campagne MERCI existe déjà pour cet email
    // On utilise le nom de la campagne qui contient l'email normalisé
    const emailNormalized = customerEmail.replace(/[^a-zA-Z0-9]/g, '-')
    const campaignPrefix = `MERCI-${emailNormalized}`
    
    logger.info(`[PROMO] Checking existing campaigns for email: ${customerEmail} (prefix: ${campaignPrefix})`)
    
    // Lister les campagnes existantes
    const existingCampaigns = await promotionModuleService.listCampaigns(
      {},
      { select: ["id", "name"], take: 1000 }
    )
    
    logger.info(`[PROMO] Found ${existingCampaigns?.length || 0} total campaigns`)
    
    // Chercher si une campagne existe déjà pour cet email
    const existingCampaignForEmail = existingCampaigns?.find((campaign) => {
      const matches = campaign.name?.startsWith(campaignPrefix)
      if (campaign.name?.startsWith('MERCI-')) {
        logger.info(`[PROMO] Checking campaign ${campaign.name}: matches = ${matches}`)
      }
      return matches
    })
    
    if (existingCampaignForEmail) {
      logger.info(`[PROMO] Customer ${customerEmail} already has a MERCI campaign: ${existingCampaignForEmail.name}, skipping`)
      return null
    }
    
    logger.info(`[PROMO] No existing campaign for ${customerEmail}, generating new code`)
    
    // Générer un code unique
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    const promoCode = `MERCI-${randomPart}`
    
    logger.info(`[PROMO] Generating first order promo code: ${promoCode} for ${customerEmail}`)
    
    // Créer la promotion avec une règle de 10% de réduction
    // On stocke l'email du client dans metadata pour éviter les doublons
    logger.info(`[PROMO] Creating promotion with code: ${promoCode}`)
    
    // D'abord créer une campagne avec budget usage=1 pour limiter à 1 utilisation
    const campaignName = `MERCI-${customerEmail.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
    
    const campaign = await promotionModuleService.createCampaigns({
      name: campaignName,
      campaign_identifier: promoCode,
      budget: {
        type: "usage",
        limit: 1, // Le code ne peut être utilisé qu'une seule fois
      },
    })
    
    logger.info(`[PROMO] Created campaign ${campaignName} with ID: ${campaign?.id}`)
    
    const promotionData = {
      code: promoCode,
      type: "standard",
      status: "active", // IMPORTANT: Le code doit être actif pour fonctionner
      is_automatic: false,
      campaign_id: campaign.id, // Lier à la campagne pour la limite d'usage
      metadata: {
        customer_email: customerEmail,
        created_for_order: order.display_id || order.id,
      },
      application_method: {
        type: "percentage",
        value: 10,
        target_type: "items", // Applique uniquement sur les produits, pas la livraison
        allocation: "across",
        currency_code: "eur",
      },
    }
    
    logger.info(`[PROMO] Promotion data: ${JSON.stringify(promotionData)}`)
    
    const promotion = await promotionModuleService.createPromotions(promotionData)
    
    logger.info(`[PROMO] ✅ Created promotion ${promoCode} with ID: ${promotion?.id || 'unknown'}`)
    
    return promoCode
    
  } catch (error) {
    const err = error as Error | undefined
    logger.error(`[PROMO] Error generating promo code: ${err?.message || "unknown"}`)
    if (err?.stack) {
      logger.error(`[PROMO] Error stack: ${err.stack}`)
    }
    // Ne pas bloquer la commande si la création du code échoue
    return null
  }
}

/**
 * Auto-link une commande guest à un compte client existant si l'email correspond
 */
async function autoLinkOrderToCustomer(
  container: Container,
  order: OrderRecord,
  logger: Logger
): Promise<void> {
  // Vérifier si la commande a déjà un customer_id (pas guest)
  if (order.customer_id) {
    logger.info(`[AUTO-LINK] Order ${order.display_id} already has customer_id, skipping`)
    return
  }

  const orderEmail = order.email?.toLowerCase()
  if (!orderEmail) {
    logger.info(`[AUTO-LINK] Order ${order.display_id} has no email, skipping`)
    return
  }

  logger.info(`[AUTO-LINK] Checking if account exists for email: ${orderEmail}`)

  try {
    const customerModuleService = container.resolve<CustomerService>("customer")
    
    // Chercher un client avec cet email (insensible à la casse)
    const customers = await customerModuleService.listCustomers(
      { email: orderEmail },
      { select: ["id", "email", "metadata"] }
    )

    // Vérifier aussi avec l'email original si différent
    let matchingCustomer = customers?.find((c) => 
      c.email?.toLowerCase() === orderEmail
    )

    if (!matchingCustomer && order.email && order.email !== orderEmail) {
      const customers2 = await customerModuleService.listCustomers(
        { email: order.email },
        { select: ["id", "email", "metadata"] }
      )
      matchingCustomer = customers2?.find((c) => 
        c.email?.toLowerCase() === orderEmail
      )
    }

    if (!matchingCustomer) {
      logger.info(`[AUTO-LINK] No account found for ${orderEmail}, order stays as guest`)
      return
    }

    logger.info(`[AUTO-LINK] Found customer ${matchingCustomer.id} for email ${orderEmail}`)

    // Lier la commande au client
    const orderModuleService = container.resolve<OrderService>("order")
    await orderModuleService.updateOrders(order.id, {
      customer_id: matchingCustomer.id,
    })

    logger.info(`[AUTO-LINK] ✅ Order ${order.display_id} linked to customer ${matchingCustomer.id}`)

  } catch (error) {
    const err = error as Error | undefined
    logger.error(`[AUTO-LINK] Error linking order: ${err?.message || "unknown"}`)
  }
}

export const config = {
  event: [OrderWorkflowEvents.PLACED, OrderWorkflowEvents.COMPLETED],
}

export default async function handleOrderEmails({ event, container }: SubscriberArgs) {
  const logger = container.resolve<Logger>("logger")
  const remoteQuery = container.resolve<RemoteQuery>("remoteQuery")

  if (!process.env.MAILJET_FROM_EMAIL) {
    logger.warn("MAILJET_FROM_EMAIL n'est pas défini. Envoi email commande ignoré.")
    return
  }

  const orderId = (event.data as { id?: string } | undefined)?.id
  if (!orderId) {
    logger.warn(`Order event without id: ${JSON.stringify(event.data)}`)
    return
  }

  try {
    logger.info(`[ORDER-PLACED] Processing order ${orderId} for event ${event.name}`)
    
    const result = await remoteQuery({
      entryPoint: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "cart_id",
        "metadata",
        "items.*",
        "shipping_address.*",
        "shipping_methods.*",
      ],
      variables: { id: orderId },
    })

    const order = Array.isArray(result) ? result[0] : result
    if (!order) {
      logger.warn(`Order not found for id ${orderId}`)
      return
    }
    
    logger.info(`[ORDER-PLACED] Order retrieved successfully: ${order.display_id || order.id}`)

    // Note: Medusa v2 copie automatiquement cart.metadata → order.metadata lors de cart.complete()
    // Aucune action manuelle n'est nécessaire, les order_notes sont déjà dans order.metadata

    // AUTO-LINK: Si la commande est guest, vérifier si un compte existe avec cet email
    let firstOrderPromoCode: string | null = null
    if (event.name === OrderWorkflowEvents.PLACED) {
      try {
        await autoLinkOrderToCustomer(container, order, logger)
      } catch (linkError) {
        const err = linkError as Error | undefined
        logger.error(`[ORDER-PLACED] Auto-link error: ${err?.message || "unknown"}`)
      }
      
      // Générer un code promo si c'est la première commande
      try {
        firstOrderPromoCode = await generateFirstOrderPromoCode(container, order, logger)
      } catch (promoError) {
        const err = promoError as Error | undefined
        logger.error(`[ORDER-PLACED] Promo code error: ${err?.message || "unknown"}`)
      }
    }

    // Envoyer notification Slack pour les nouvelles commandes
    if (event.name === OrderWorkflowEvents.PLACED) {
      try {
        const shippingAddr = order.shipping_address
        const shippingMethod = order.shipping_methods?.[0]
        
        // Récupérer le point relais depuis les metadata
        const relayPoint = order.metadata?.relay_point
        
        const orderItems = order.items ?? []
        await sendOrderNotificationToSlack({
          orderId: order.id,
          displayId: order.display_id || order.id,
          customerEmail: order.email || "unknown",
          customerName: shippingAddr ? `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim() : undefined,
          total: order.total,
          currencyCode: order.currency_code,
          items: orderItems.map((item) => ({
            title: item.title || "",
            quantity: item.quantity ?? 0,
            total: item.total ?? 0,
          })),
          shippingAddress: shippingAddr ? {
            firstName: shippingAddr.first_name,
            lastName: shippingAddr.last_name,
            address1: shippingAddr.address_1,
            address2: shippingAddr.address_2,
            city: shippingAddr.city,
            postalCode: shippingAddr.postal_code,
            province: shippingAddr.province,
            countryCode: shippingAddr.country_code,
            phone: shippingAddr.phone,
          } : undefined,
          shippingMethod: shippingMethod ? {
            name: shippingMethod.name || 'Livraison',
            amount: shippingMethod.amount || 0,
          } : undefined,
          relayPoint: relayPoint ? {
            id: relayPoint.id,
            name: relayPoint.name,
            address: relayPoint.address,
            postalCode: relayPoint.postalCode,
            city: relayPoint.city,
            country: relayPoint.country,
          } : undefined,
          orderNotes: order.metadata?.order_notes,
          orderUrl: `https://gomgombonbons.com/fr/print-label/${order.id}`,
        })
      } catch (slackError) {
        const err = slackError as Error | undefined
        logger.error(`Erreur notification Slack: ${err?.message || "unknown"}`)
        // Ne pas bloquer l'envoi d'email si Slack échoue
      }
    }

    // Envoi d'email de confirmation
    try {
      const to = order.email
      if (!to || !to.includes("@")) {
        logger.warn(`Order ${orderId} has no email; skipping email notification.`)
        return
      }

      logger.info(`[ORDER-PLACED] Preparing email for ${to}`)

      const orderUrl = `https://gomgombonbons.com/fr/account/orders`
      const subject = event.name === OrderWorkflowEvents.COMPLETED ?
        `Votre commande #${order.display_id || order.id} est terminée` :
        `Confirmation de commande #${order.display_id || order.id}`

      const html = buildOrderEmailHtml({
        order,
        firstOrderPromoCode,
        orderUrl,
      })

      const text = buildOrderEmailText({
        order,
        firstOrderPromoCode,
        orderUrl,
      })

      await sendMailjetEmail({ to, subject, html, text })
      logger.info(`[ORDER-PLACED] Email sent successfully to ${to}`)
    } catch (emailError) {
      const err = emailError as Error | undefined
      logger.error(`[ORDER-PLACED] Failed sending email for ${orderId}: ${err?.message || "unknown"}`)
      if (err?.stack) {
        logger.error(`[ORDER-PLACED] Email error stack: ${err.stack}`)
      }
    }
  } catch (e) {
    const err = e as Error | undefined
    logger.error(`[ORDER-PLACED] Failed processing order ${orderId}: ${err?.message || "unknown"}`)
    if (err?.stack) {
      logger.error(`[ORDER-PLACED] Error stack: ${err.stack}`)
    }
  }
}
