import type { SubscriberArgs } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/utils"
import { sendMailjetEmail } from "../lib/email/mailjet"

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
        "items.id",
        "items.title",
        "items.quantity",
        "items.total",
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

    const to = order.email as string | undefined
    if (!to || !to.includes("@")) {
      logger.warn(`Order ${orderId} has no email; skipping notification.`)
      return
    }

    const orderUrl = `${frontendUrl.replace(/\/?$/, "")}/orders/${order.display_id || order.id}`
    const subject = event.name === OrderWorkflowEvents.COMPLETED ?
      `Votre commande #${order.display_id || order.id} est terminée` :
      `Confirmation de commande #${order.display_id || order.id}`

    const format = (amount?: number, currency?: string) => {
      try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: (currency || "EUR").toUpperCase() }).format(((amount || 0) / 100)); } catch { return `${(amount || 0) / 100} ${currency || "EUR"}` }
    }

    const lines = (order.items || []).map((it: any) => `<tr><td>${it.title}</td><td style="text-align:right">x${it.quantity}</td><td style="text-align:right">${format(it.total, order.currency_code)}</td></tr>`).join("")

    const html = `
      <div>
        <p>Merci pour votre commande !</p>
        <p>Numéro de commande: <strong>#${order.display_id || order.id}</strong></p>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
          <thead>
            <tr><th align="left">Article</th><th align="right">Qté</th><th align="right">Total</th></tr>
          </thead>
          <tbody>
            ${lines}
            <tr><td colspan="2" align="right"><strong>Sous-total</strong></td><td align="right">${format(order.subtotal, order.currency_code)}</td></tr>
            <tr><td colspan="2" align="right"><strong>Livraison</strong></td><td align="right">${format(order.shipping_total, order.currency_code)}</td></tr>
            <tr><td colspan="2" align="right"><strong>Taxes</strong></td><td align="right">${format(order.tax_total, order.currency_code)}</td></tr>
            <tr><td colspan="2" align="right"><strong>Total</strong></td><td align="right"><strong>${format(order.total, order.currency_code)}</strong></td></tr>
          </tbody>
        </table>
        <p>Suivre ma commande: <a href="${orderUrl}">${orderUrl}</a></p>
      </div>
    `

    const text = `Merci pour votre commande !\nCommande #${order.display_id || order.id}\nTotal: ${format(order.total, order.currency_code)}\nSuivre ma commande: ${orderUrl}`

    await sendMailjetEmail({ to, subject, html, text })
    logger.info(`Order email (${event.name}) sent to ${to} for order ${orderId}`)
  } catch (e: any) {
    logger.error(`Failed sending order email for ${orderId}: ${e?.message || e}`)
  }
}
