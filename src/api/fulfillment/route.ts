import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // Vérifier le token d'authentification
  const authToken = req.headers["x-fulfillment-token"] as string
  const expectedToken = process.env.FULFILLMENT_SECRET_TOKEN
  
  if (!authToken || authToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing authentication token",
    })
  }

  const body = req.body as { orderId?: string; trackingNumber?: string }
  const { orderId, trackingNumber } = body

  if (!orderId || !trackingNumber) {
    return res.status(400).json({
      success: false,
      error: "orderId and trackingNumber are required",
    })
  }

  try {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as any
    
    // Récupérer la commande avec tous les détails + fulfillments existants
    const [order] = await remoteQuery({
      entryPoint: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "items.*",
        "shipping_address.*",
        "shipping_methods.*",
        "fulfillments.*",
        "fulfillments.labels.*",
      ],
      variables: { filters: { id: orderId } },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Détecter si déjà expédié via les fulfillments existants (shipped_at non null)
    const existingFulfillments: any[] = order.fulfillments || []
    const alreadyShipped = existingFulfillments.some((f: any) => f.shipped_at !== null && f.canceled_at === null)

    logger.info(`[FULFILLMENT] Processing order ${orderId} (already shipped: ${alreadyShipped}, fulfillments: ${existingFulfillments.length}) with tracking ${trackingNumber}`)

    // Détecter le transporteur depuis shipping_methods
    let carrier = "colissimo" // Par défaut
    let trackingUrl = ""
    
    if (order.shipping_methods && order.shipping_methods.length > 0) {
      const shippingMethod = order.shipping_methods[0]
      const methodName = shippingMethod.name?.toLowerCase() || ""
      
      logger.info(`[FULFILLMENT] Shipping method name: ${methodName}`)
      
      if (methodName.includes("mondial") || methodName.includes("relay")) {
        carrier = "mondial-relay"
        trackingUrl = `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${trackingNumber}`
      } else if (methodName.includes("chronopost")) {
        carrier = "chronopost"
        trackingUrl = `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${trackingNumber}`
      } else if (methodName.includes("colissimo")) {
        carrier = "colissimo"
        trackingUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
      } else {
        carrier = "colissimo"
        trackingUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
      }
    } else {
      trackingUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
    }

    logger.info(`[FULFILLMENT] Detected carrier: ${carrier}, tracking URL: ${trackingUrl}`)

    // ── CAS 1 : commande déjà expédiée → on renvoie juste l'email avec le nouveau tracking ──
    if (alreadyShipped) {
      logger.info(`[FULFILLMENT] Order already shipped — skipping fulfillment creation, resending email with new tracking`)
      // Pas de création de fulfillment, on passe directement à l'email
    } else {
      // ── CAS 2 : première expédition normale ──
      const { createOrderFulfillmentWorkflow } = await import("@medusajs/medusa/core-flows")
      const { result } = await createOrderFulfillmentWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          created_by: "admin",
          items: order.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          no_notification: false,
          location_id: null,
          metadata: {
            tracking_number: trackingNumber,
            carrier: carrier,
            tracking_url: trackingUrl,
          },
        },
      })

      logger.info(`[FULFILLMENT] Fulfillment created: ${JSON.stringify(result)}`)

      const { createOrderShipmentWorkflow } = await import("@medusajs/medusa/core-flows")
      const fulfillmentId = result.id
      
      await createOrderShipmentWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          fulfillment_id: fulfillmentId,
          items: order.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          labels: [
            {
              tracking_number: trackingNumber,
              tracking_url: trackingUrl,
              label_url: "",
            }
          ],
        },
      })

      logger.info(`[SHIPMENT] Shipment created with tracking: ${trackingNumber}`)
    }

    // Envoyer un email personnalisé au client
    const { sendResendEmail } = await import("../../lib/email/resend.js")

    const carrierName = carrier === "mondial-relay"
      ? "Mondial Relay"
      : carrier === "chronopost"
        ? "Chronopost"
        : "Colissimo"

    const year = new Date().getFullYear()

    const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre colis est expédié - GomGom Bonbons</title>
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
                Votre colis est en route.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 48px 40px;text-align:center;">
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#4B5563;">
                Bonne nouvelle ! Votre commande a été expédiée via <strong style="color:#111827;">${carrierName}</strong>.<br>Vous pouvez suivre votre colis en temps réel grâce au numéro ci-dessous.
              </p>

              <div style="background-color:#FAFAFA;border-radius:16px;padding:24px;margin-bottom:32px;border:1px solid #F3F4F6;">
                <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#4B5563;font-weight:bold;">Numéro de suivi</p>
                <p style="margin:0;font-size:22px;font-weight:bold;color:#111827;letter-spacing:2px;">${trackingNumber}</p>
                <p style="margin:8px 0 0;font-size:13px;color:#6B7280;">${carrierName}</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 36px;">
                    <a href="${trackingUrl}"
                       style="display:inline-block;background-color:#FFE1EA;color:#9f1239;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:50px;">
                      Suivre mon colis
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">
                Si le lien ne fonctionne pas, rendez-vous sur le site de ${carrierName}<br>et saisissez votre numéro de suivi manuellement.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F9FAFB;border-top:1px solid #F3F4F6;padding:32px 48px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                © ${year} GomGom Bonbons<br>
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

    const emailText = `
Votre colis est en route !

Commande #${order.display_id || order.id}
Transporteur : ${carrierName}
Numéro de suivi : ${trackingNumber}

Suivre votre colis : ${trackingUrl}

Merci pour votre confiance !
L'équipe GomGom Bonbons
gomgombonbons.com
    `.trim()

    await sendResendEmail({
      to: order.email,
      subject: `Votre commande #${order.display_id || order.id} est expédiée — GomGom`,
      html: emailHtml,
      text: emailText,
    })

    logger.info(`[FULFILLMENT] Shipping notification email sent to ${order.email}`)

    return res.json({
      success: true,
      message: "Order fulfilled and notification sent",
      carrier,
      trackingNumber,
      trackingUrl,
    })

  } catch (error: any) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error(`[FULFILLMENT] Error: ${error?.message || error}`)
    
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to create fulfillment",
    })
  }
}
