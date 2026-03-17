import type { SubscriberArgs } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/utils"
import { sendResendEmail } from "../lib/email/resend"
import { sendOrderNotificationToSlack } from "../lib/slack/notifications"

// ─── TYPES ─── (Inchangés)
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

// ─── HELPERS ───
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

// ─── FONCTIONS DE RENDU HTML (REFONTE DESIGN) ───

const buildOrderLines = (items: OrderItem[], currency: string) =>
  items
    .map(
      (it) => `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #F3F4F6;">
            <div style="font-weight: 600; color: #111827; font-size: 14px;">${it.title}</div>
            <div style="font-size: 13px; color: #6B7280; margin-top: 4px;">Quantité : ${it.quantity}</div>
          </td>
          <td style="padding: 16px 0; text-align: right; border-bottom: 1px solid #F3F4F6; font-weight: 600; color: #111827; font-size: 14px;">
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
      <div style="background-color: #FAFAFA; border-radius: 16px; padding: 24px; margin-top: 32px; border: 1px solid #F3F4F6;">
        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #4B5563;">Point de livraison</h3>
        <p style="margin: 0; color: #111827; line-height: 1.6; font-size: 14px;">
          <strong style="color: #0f5150;">${relayPoint.name}</strong><br>
          ${relayPoint.address}<br>
          ${relayPoint.postalCode} ${relayPoint.city}
        </p>
        ${shippingAddr?.phone ? `<p style="margin: 12px 0 0 0; color: #6B7280; font-size: 13px;">Tél : ${shippingAddr.phone}</p>` : ""}
      </div>
    `
  }

  if (!shippingAddr) {
    return ""
  }

  return `
      <div style="background-color: #FAFAFA; border-radius: 16px; padding: 24px; margin-top: 32px; border: 1px solid #F3F4F6;">
        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #4B5563;">Adresse de livraison</h3>
        <p style="margin: 0; color: #111827; line-height: 1.6; font-size: 14px;">
          <strong>${shippingAddr.first_name} ${shippingAddr.last_name}</strong><br>
          ${shippingAddr.address_1}<br>
          ${shippingAddr.address_2 ? `${shippingAddr.address_2}<br>` : ""}
          ${shippingAddr.postal_code} ${shippingAddr.city}<br>
          ${shippingAddr.province ? `${shippingAddr.province}<br>` : ""}
        </p>
        ${shippingAddr?.phone ? `<p style="margin: 12px 0 0 0; color: #6B7280; font-size: 13px;">Tél : ${shippingAddr.phone}</p>` : ""}
      </div>
  `
}

const buildOrderNotesHtml = (notes?: string) =>
  notes
    ? `
      <div style="background-color: #FEF3C7; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #92400E;">Instructions spéciales</h3>
        <p style="margin: 0; color: #92400E; line-height: 1.6; font-size: 14px;">
          ${String(notes).replace(/\n/g, "<br>")}
        </p>
      </div>
      `
    : ""

// ─── TEMPLATE HTML PRINCIPAL ───
const buildOrderEmailHtml = ({ order, firstOrderPromoCode, orderUrl }: EmailTemplateInput) => {
  const shippingAddr = order.shipping_address
  const relayPoint = order.metadata?.relay_point
  const lines = buildOrderLines(order.items ?? [], order.currency_code)
  const addressHtml = buildAddressHtml(shippingAddr, relayPoint, order.shipping_methods?.[0]?.name)
  const orderNotesHtml = buildOrderNotesHtml(order.metadata?.order_notes)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Commande confirmée - GomGom Bonbons</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAFA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;border:1px solid #F3F4F6;overflow:hidden;">
          
          <tr>
            <td align="center" style="padding:48px 40px 16px;">
              
              <a href="https://gomgombonbons.com" style="display:block;margin:0 auto 24px;width:100px;">
                <img src="https://gomgombonbons.com/images/transparent.png"
                     alt="GomGom Bonbons"
                     width="100" height="100"
                     style="width:100px;height:100px;border-radius:50%;object-fit:contain;background:#ffffff;padding:8px;box-shadow:0 4px 20px rgba(0,0,0,0.06);display:block;" />
              </a>

              <span style="display:inline-block;padding:6px 16px;border-radius:50px;background-color:#89E1DD;color:#0f5150;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">
                Commande #${order.display_id || order.id}
              </span>
              
              <h1 style="margin:0;font-family:Georgia, 'Times New Roman', serif;font-size:32px;font-style:italic;color:#9f1239;font-weight:normal;letter-spacing:0.5px;">
                Merci pour votre commande.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 48px 40px;text-align:center;">
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#4B5563;">
                Bonjour <strong style="color:#111827;">${shippingAddr?.first_name || "cher client"}</strong>,<br><br>
                Nous avons bien reçu votre commande et nous la préparons avec le plus grand soin. Vous recevrez un email dès que celle-ci sera expédiée.
              </p>

              ${orderNotesHtml}

              <div style="text-align:left; background-color: #ffffff; margin-bottom: 32px;">
                <h3 style="margin:0 0 16px 0; font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#4B5563; border-bottom: 2px solid #F3F4F6; padding-bottom: 12px;">Récapitulatif</h3>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tbody>
                    ${lines}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style="padding:16px 0 8px; text-align:right; color:#6B7280; font-size:14px;">Sous-total</td>
                      <td style="padding:16px 0 8px; text-align:right; color:#111827; font-size:14px; font-weight: 500;">${formatAmount(order.subtotal, order.currency_code)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0; text-align:right; color:#6B7280; font-size:14px;">Livraison</td>
                      <td style="padding:8px 0; text-align:right; color:#111827; font-size:14px; font-weight: 500;">${formatAmount(order.shipping_total, order.currency_code)}</td>
                    </tr>
                    <tr>
                      <td style="padding:16px 0 0; text-align:right; font-weight:bold; color:#9f1239; font-size:18px; border-top: 2px solid #F3F4F6;">Total</td>
                      <td style="padding:16px 0 0; text-align:right; font-weight:bold; color:#9f1239; font-size:18px; border-top: 2px solid #F3F4F6;">${formatAmount(order.total, order.currency_code)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style="text-align: left;">
                ${addressHtml}
              </div>

              ${firstOrderPromoCode ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:40px 0 24px; background-color: #FAFAFA; border-radius: 20px; border: 1px solid #E5E7EB;">
                <tr>
                  <td align="center" style="padding:32px 24px;">
                    <span style="display:inline-block;padding:4px 12px;border-radius:50px;background-color:#FFE1EA;color:#9f1239;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">
                      Cadeau de bienvenue
                    </span>
                    <h3 style="margin:0 0 16px;font-family:Georgia, 'Times New Roman', serif;font-size:22px;font-style:italic;color:#111827;font-weight:normal;">Une petite attention pour vous.</h3>
                    <p style="margin:0 0 24px;font-size:14px;color:#4B5563;">Pour vous remercier de votre première commande, profitez de <strong>-10%</strong> sur la prochaine, sans minimum d'achat.</p>
                    
                    <div style="background-color:#ffffff;border: 1px dashed #D1D5DB; border-radius:12px;padding:16px 24px;display:inline-block;margin:0 0 8px;">
                      <p style="margin:0;font-size:24px;font-weight:bold;color:#0f5150;letter-spacing:2px;">${firstOrderPromoCode}</p>
                    </div>
                    <p style="margin:0;font-size:12px;color:#9CA3AF;">Code personnel à usage unique.</p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px;">
                <tr>
                  <td align="center">
                    <a href="${orderUrl}"
                       style="display:inline-block;background-color:#FFE1EA;color:#9f1239;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:50px;">
                      Suivre ma commande
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background-color:#F9FAFB;border-top:1px solid #F3F4F6;padding:32px 48px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                © ${new Date().getFullYear()} GomGom Bonbons<br>
                L'art d'offrir la gourmandise.<br><br>
                <a href="https://gomgombonbons.com" style="color:#0f5150;text-decoration:none;font-weight:500;">gomgombonbons.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── LOGIQUE MEDUSA (Inchangée) ───

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
Point de livraison:
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
CADEAU DE BIENVENUE
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
    
    const emailNormalized = customerEmail.replace(/[^a-zA-Z0-9]/g, '-')
    const campaignPrefix = `MERCI-${emailNormalized}`
    
    logger.info(`[PROMO] Checking existing campaigns for email: ${customerEmail} (prefix: ${campaignPrefix})`)
    
    const existingCampaigns = await promotionModuleService.listCampaigns(
      {},
      { select: ["id", "name"], take: 1000 }
    )
    
    logger.info(`[PROMO] Found ${existingCampaigns?.length || 0} total campaigns`)
    
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
    
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    const promoCode = `MERCI-${randomPart}`
    
    logger.info(`[PROMO] Generating first order promo code: ${promoCode} for ${customerEmail}`)
    logger.info(`[PROMO] Creating promotion with code: ${promoCode}`)
    
    const campaignName = `MERCI-${customerEmail.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
    
    const campaign = await promotionModuleService.createCampaigns({
      name: campaignName,
      campaign_identifier: promoCode,
      budget: {
        type: "usage",
        limit: 1, 
      },
    })
    
    logger.info(`[PROMO] Created campaign ${campaignName} with ID: ${campaign?.id}`)
    
    const promotionData = {
      code: promoCode,
      type: "standard",
      status: "active", 
      is_automatic: false,
      campaign_id: campaign.id, 
      metadata: {
        customer_email: customerEmail,
        created_for_order: order.display_id || order.id,
      },
      application_method: {
        type: "percentage",
        value: 10,
        target_type: "items", 
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
    return null
  }
}

async function autoLinkOrderToCustomer(
  container: Container,
  order: OrderRecord,
  logger: Logger
): Promise<void> {
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
    
    const customers = await customerModuleService.listCustomers(
      { email: orderEmail },
      { select: ["id", "email", "metadata"] }
    )

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

  if (!process.env.RESEND_FROM_EMAIL) {
    logger.warn("RESEND_FROM_EMAIL n'est pas défini. Envoi email commande ignoré.")
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

    let firstOrderPromoCode: string | null = null
    if (event.name === OrderWorkflowEvents.PLACED) {
      try {
        await autoLinkOrderToCustomer(container, order, logger)
      } catch (linkError) {
        const err = linkError as Error | undefined
        logger.error(`[ORDER-PLACED] Auto-link error: ${err?.message || "unknown"}`)
      }
      
      try {
        firstOrderPromoCode = await generateFirstOrderPromoCode(container, order, logger)
      } catch (promoError) {
        const err = promoError as Error | undefined
        logger.error(`[ORDER-PLACED] Promo code error: ${err?.message || "unknown"}`)
      }
    }

    if (event.name === OrderWorkflowEvents.PLACED) {
      try {
        const shippingAddr = order.shipping_address
        const shippingMethod = order.shipping_methods?.[0]
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
      }
    }

    try {
      const to = order.email
      if (!to || !to.includes("@")) {
        logger.warn(`Order ${orderId} has no email; skipping email notification.`)
        return
      }

      logger.info(`[ORDER-PLACED] Preparing email for ${to}`)

      const orderUrl = `https://gomgombonbons.com/fr/account/orders`
      const subject = event.name === OrderWorkflowEvents.COMPLETED ?
        `Votre commande #${order.display_id || order.id} est expédiée` :
        `Confirmation de commande #${order.display_id || order.id} — GomGom`

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

      await sendResendEmail({ to, subject, html, text })
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