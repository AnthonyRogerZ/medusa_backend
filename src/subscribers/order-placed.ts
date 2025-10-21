import type { SubscriberArgs } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/utils"
import { sendMailjetEmail } from "../lib/email/mailjet"
import { sendOrderNotificationToSlack } from "../lib/slack/notifications"

export const config = {
  event: [OrderWorkflowEvents.PLACED, OrderWorkflowEvents.COMPLETED],
}

export default async function handleOrderEmails({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }
  const remoteQuery = container.resolve("remoteQuery") as any

  const from = process.env.RESEND_FROM
  if (!process.env.MAILJET_FROM_EMAIL) {
    logger.warn("MAILJET_FROM_EMAIL n'est pas défini. Envoi email commande ignoré.")
    return
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://gomgom-bonbons.vercel.app"

  const orderId = (event.data as any)?.id as string | undefined
  if (!orderId) {
    logger.warn(`Order event without id: ${JSON.stringify(event.data)}`)
    return
  }

  try {
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
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.postal_code",
        "shipping_address.province",
        "shipping_address.country_code",
        "shipping_address.phone",
        "shipping_methods.*",
        "shipping_methods.shipping_option.*",
        "shipping_methods.shipping_option.name",
      ],
      variables: { id: orderId },
    })

    const order = Array.isArray(result) ? result[0] : result
    if (!order) {
      logger.warn(`Order not found for id ${orderId}`)
      return
    }

    // Note: Medusa v2 copie automatiquement cart.metadata → order.metadata lors de cart.complete()
    // Aucune action manuelle n'est nécessaire, les order_notes sont déjà dans order.metadata

    // Debug: vérifier les items
    logger.info(`[DEBUG] Order items: ${JSON.stringify(order.items)}`)
    
    // Envoyer notification Slack pour les nouvelles commandes
    if (event.name === OrderWorkflowEvents.PLACED) {
      try {
        const shippingAddr = order.shipping_address
        const shippingMethod = order.shipping_methods?.[0]
        const shippingOption = shippingMethod?.shipping_option
        
        await sendOrderNotificationToSlack({
          orderId: order.id,
          displayId: order.display_id || order.id,
          customerEmail: order.email,
          customerName: shippingAddr ? `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim() : undefined,
          total: order.total,
          currencyCode: order.currency_code,
          items: (order.items || []).map((item: any) => ({
            title: item.title,
            quantity: item.quantity,
            total: item.total,
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
          shippingMethod: shippingOption ? {
            name: shippingOption.name || 'Non spécifié',
            amount: shippingMethod.amount || 0,
          } : undefined,
          orderNotes: order.metadata?.order_notes,
          orderUrl: `https://gomgom-bonbons.vercel.app/fr/print-label/${order.id}`,
        })
      } catch (slackError: any) {
        logger.error(`Erreur notification Slack: ${slackError?.message || slackError}`)
        // Ne pas bloquer l'envoi d'email si Slack échoue
      }
    }

    const to = order.email as string | undefined
    if (!to || !to.includes("@")) {
      logger.warn(`Order ${orderId} has no email; skipping notification.`)
      return
    }

    const orderUrl = `https://gomgom-bonbons.vercel.app/fr/account/orders`
    const subject = event.name === OrderWorkflowEvents.COMPLETED ?
      `Votre commande #${order.display_id || order.id} est terminée` :
      `Confirmation de commande #${order.display_id || order.id}`

    const format = (amount?: number, currency?: string) => {
      // Medusa v2 stocke les montants déjà en euros (pas en centimes)
      try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: (currency || "EUR").toUpperCase() }).format(amount || 0); } catch { return `${amount || 0} ${currency || "EUR"}` }
    }

    const lines = (order.items || []).map((it: any) => 
      `<tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 15px 10px;">
          <div style="font-weight: 500; color: #000;">${it.title}</div>
          <div style="font-size: 13px; color: #666;">Quantité: ${it.quantity}</div>
        </td>
        <td style="padding: 15px 10px; text-align: right; font-weight: 500; color: #000;">
          ${format(it.total, order.currency_code)}
        </td>
      </tr>`
    ).join("")

    const shippingAddr = order.shipping_address
    const addressHtml = shippingAddr ? `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #000;">📍 Adresse de livraison</h3>
        <p style="margin: 5px 0; color: #333; line-height: 1.6;">
          <strong>${shippingAddr.first_name} ${shippingAddr.last_name}</strong><br>
          ${shippingAddr.address_1}<br>
          ${shippingAddr.address_2 ? `${shippingAddr.address_2}<br>` : ''}
          ${shippingAddr.postal_code} ${shippingAddr.city}<br>
          ${shippingAddr.province ? `${shippingAddr.province}<br>` : ''}
          ${shippingAddr.phone ? `📞 ${shippingAddr.phone}` : ''}
        </p>
      </div>
    ` : ''

    const orderNotesHtml = order.metadata?.order_notes ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #856404; font-size: 14px;">
          📝 Instructions spéciales
        </p>
        <p style="margin: 0; color: #856404; line-height: 1.6;">
          ${String(order.metadata.order_notes).replace(/\n/g, '<br>')}
        </p>
      </div>
    ` : ''

    const html = `
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
            Bonjour <strong>${shippingAddr?.first_name || 'cher client'}</strong>,
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
                  <td style="padding: 15px 10px; text-align: right; color: #666;">${format(order.subtotal, order.currency_code)}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 15px 10px; text-align: right; color: #666;">Livraison</td>
                  <td style="padding: 15px 10px; text-align: right; color: #666;">${format(order.shipping_total, order.currency_code)}</td>
                </tr>
                <tr style="background: #FFB6C1;">
                  <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #000; font-size: 18px;">Total</td>
                  <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #000; font-size: 18px;">${format(order.total, order.currency_code)}</td>
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

    const text = `
Commande Confirmée !

Bonjour ${shippingAddr?.first_name || 'cher client'},

Nous avons bien reçu votre commande #${order.display_id || order.id}.

Articles:
${(order.items || []).map((it: any) => `- ${it.title} x${it.quantity} - ${format(it.total, order.currency_code)}`).join('\n')}

Sous-total: ${format(order.subtotal, order.currency_code)}
Livraison: ${format(order.shipping_total, order.currency_code)}
Total: ${format(order.total, order.currency_code)}

${shippingAddr ? `
Adresse de livraison:
${shippingAddr.first_name} ${shippingAddr.last_name}
${shippingAddr.address_1}
${shippingAddr.postal_code} ${shippingAddr.city}
` : ''}

${order.metadata?.order_notes ? `Instructions spéciales: ${order.metadata.order_notes}\n` : ''}

Suivre ma commande: ${orderUrl}

Merci pour votre confiance !
L'équipe GomGom Bonbons
    `.trim()

    await sendMailjetEmail({ to, subject, html, text })
    logger.info(`Order email (${event.name}) sent to ${to} for order ${orderId}`)
  } catch (e: any) {
    logger.error(`Failed sending order email for ${orderId}: ${e?.message || e}`)
  }
}
