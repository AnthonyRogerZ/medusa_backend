/**
 * Service de notifications Slack pour les commandes
 */

interface OrderNotificationData {
  orderId: string
  displayId: string
  customerEmail: string
  customerName?: string
  total: number
  currencyCode: string
  items: Array<{
    title: string
    quantity: number
    total: number
  }>
  shippingAddress?: {
    firstName?: string
    lastName?: string
    address1?: string
    address2?: string
    city?: string
    postalCode?: string
    province?: string
    countryCode?: string
    phone?: string
  }
  orderNotes?: string
  orderUrl?: string
}

/**
 * Formate le montant en euros
 */
function formatAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount / 100)
}

/**
 * Construit le message Slack formaté
 */
function buildSlackMessage(data: OrderNotificationData) {
  const {
    orderId,
    displayId,
    customerEmail,
    customerName,
    total,
    currencyCode,
    items,
    shippingAddress,
    orderNotes,
    orderUrl,
  } = data

  // Adresse formatée
  const addressLines: string[] = []
  if (shippingAddress) {
    const fullName = `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim()
    if (fullName) addressLines.push(fullName)
    if (shippingAddress.address1) addressLines.push(shippingAddress.address1)
    if (shippingAddress.address2) addressLines.push(shippingAddress.address2)
    const cityParts: string[] = []
    if (shippingAddress.postalCode) cityParts.push(shippingAddress.postalCode)
    if (shippingAddress.city) cityParts.push(shippingAddress.city)
    if (shippingAddress.province) cityParts.push(shippingAddress.province)
    const cityLine = cityParts.join(' ')
    if (cityLine) addressLines.push(cityLine)
    if (shippingAddress.countryCode) addressLines.push(shippingAddress.countryCode.toUpperCase())
    if (shippingAddress.phone) addressLines.push(`📞 ${shippingAddress.phone}`)
  }

  // Produits formatés
  const itemsList = items.map(item => 
    `• ${item.title} x${item.quantity} - ${formatAmount(item.total, currencyCode)}`
  ).join('\n')

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🎉 Nouvelle Commande #${displayId}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total:*\n${formatAmount(total, currencyCode)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${customerName || customerEmail}`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📦 Produits:*\n${itemsList}`,
        },
      },
      ...(addressLines.length > 0 ? [
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📍 Adresse de Livraison:*\n${addressLines.join('\n')}`,
          },
        },
      ] : []),
      ...(orderNotes ? [
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📝 Instructions Spéciales:*\n_"${orderNotes}"_`,
          },
        },
      ] : []),
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          ...(orderUrl ? [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👁️ Voir la Commande',
                emoji: true,
              },
              url: orderUrl,
              style: 'primary',
            },
          ] : []),
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🖨️ Imprimer Étiquette',
              emoji: true,
            },
            url: `https://medusabackend-production-e0e9.up.railway.app/app/orders/${orderId}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📧 ${customerEmail} | 🆔 ${orderId}`,
          },
        ],
      },
    ],
  }
}

/**
 * Envoie la notification Slack
 */
export async function sendOrderNotificationToSlack(data: OrderNotificationData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('⚠️ [SLACK] SLACK_WEBHOOK_URL non configuré, notification ignorée')
    return
  }

  try {
    const message = buildSlackMessage(data)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack API error: ${response.status} - ${errorText}`)
    }

    console.log(`✅ [SLACK] Notification envoyée pour commande #${data.displayId}`)
  } catch (error: any) {
    console.error(`❌ [SLACK] Erreur envoi notification:`, error?.message || error)
    // Ne pas bloquer le flux si Slack échoue
  }
}
