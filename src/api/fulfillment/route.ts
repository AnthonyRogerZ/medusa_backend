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
    
    // Récupérer la commande avec tous les détails
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
        "shipping_methods.shipping_option_id",
        "shipping_methods.shipping_option.*",
        "shipping_methods.shipping_option.name",
        "shipping_methods.shipping_option.data",
      ],
      variables: { filters: { id: orderId } },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    logger.info(`[FULFILLMENT] Processing order ${orderId} with tracking ${trackingNumber}`)

    // Détecter le transporteur depuis shipping_methods
    let carrier = "colissimo" // Par défaut
    let trackingUrl = ""
    
    if (order.shipping_methods && order.shipping_methods.length > 0) {
      const shippingMethod = order.shipping_methods[0]
      const shippingOption = shippingMethod.shipping_option
      const optionName = shippingOption?.name?.toLowerCase() || ""
      const optionData = shippingOption?.data || {}
      const optionId = (optionData.id || "").toLowerCase()
      
      logger.info(`[FULFILLMENT] Shipping option name: ${optionName}, id: ${optionId}`)
      
      // Détecter depuis le nom ou l'ID de l'option
      if (optionName.includes("mondial") || optionName.includes("relay") || optionId === "mondial-relay") {
        carrier = "mondial-relay"
        trackingUrl = `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${trackingNumber}`
      } else if (optionName.includes("chronopost") || optionId === "chronopost") {
        carrier = "chronopost"
        trackingUrl = `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${trackingNumber}`
      } else if (optionName.includes("colissimo") || optionId === "colissimo") {
        carrier = "colissimo"
        trackingUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
      } else {
        // Fallback: Colissimo par défaut
        carrier = "colissimo"
        trackingUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
      }
    } else {
      trackingUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`
    }

    logger.info(`[FULFILLMENT] Detected carrier: ${carrier}, tracking URL: ${trackingUrl}`)

    // Créer le fulfillment via workflow Medusa
    const { createOrderFulfillmentWorkflow } = await import("@medusajs/medusa/core-flows")
    const { result } = await createOrderFulfillmentWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        created_by: "admin", // Peut être amélioré avec auth
        items: order.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        no_notification: false, // Envoyer la notification Medusa par défaut
        location_id: null, // Utiliser la location par défaut
        metadata: {
          tracking_number: trackingNumber,
          carrier: carrier,
          tracking_url: trackingUrl,
        },
      },
    })

    logger.info(`[FULFILLMENT] Fulfillment created: ${JSON.stringify(result)}`)

    // Créer le shipment avec tracking number pour marquer comme expédié
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
            label_url: "", // Optionnel
          }
        ],
      },
    })

    logger.info(`[SHIPMENT] Shipment created with tracking: ${trackingNumber}`)

    // Envoyer un email personnalisé au client
    const { sendMailjetEmail } = await import("../../lib/email/mailjet.js")
    
    const carrierName = carrier === "mondial-relay" 
      ? "Mondial Relay" 
      : carrier === "chronopost" 
        ? "Chronopost" 
        : "Colissimo"

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #000;">
          <h1 style="margin: 0; color: #000;">📦 Votre colis est expédié !</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; line-height: 1.6;">
            Bonjour,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Bonne nouvelle ! Votre commande <strong>#${order.display_id || order.id}</strong> a été expédiée 
            via <strong>${carrierName}</strong>.
          </p>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">
              📋 Numéro de suivi :
            </p>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #000;">
              ${trackingNumber}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}" 
               style="display: inline-block; background: #000; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              🔍 Suivre mon colis
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; line-height: 1.6;">
            Vous pouvez suivre votre colis en temps réel en cliquant sur le bouton ci-dessus 
            ou en utilisant le numéro de suivi sur le site de ${carrierName}.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #999; text-align: center;">
            Merci pour votre confiance !<br>
            L'équipe GomGom Bonbons 🍬
          </p>
        </div>
      </div>
    `

    const emailText = `
Votre colis est expédié !

Commande #${order.display_id || order.id}
Transporteur: ${carrierName}
Numéro de suivi: ${trackingNumber}

Suivre votre colis: ${trackingUrl}

Merci pour votre confiance !
L'équipe GomGom Bonbons
    `.trim()

    await sendMailjetEmail({
      to: order.email,
      subject: `📦 Votre commande #${order.display_id || order.id} est expédiée !`,
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
