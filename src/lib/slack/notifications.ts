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
  shippingMethod?: {
    name: string
    amount: number
  }
  relayPoint?: {
    id: string
    name: string
    address: string
    postalCode: string
    city: string
    country?: string
  }
  handDeliveryZone?: string
  orderNotes?: string
  orderUrl?: string
}

const logger = (globalThis as { medusaLogger?: { info: (message: string) => void; warn: (message: string) => void; error: (message: string, error?: unknown) => void } }).medusaLogger ?? {
  info: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
  error: (message: string, error?: unknown) => console.error(message, error),
}

/**
 * Formate le montant en euros
 * Medusa v2 stocke les montants déjà en euros (pas en centimes)
 */
function formatAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount)
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
    shippingMethod,
    relayPoint,
    handDeliveryZone,
    orderNotes,
    orderUrl,
  } = data

  // Détecter si remise en main propre
  const checkHandDelivery = (methodName: string): boolean => {
    const name = methodName.toLowerCase()
    return name.includes('remise en main propre') || name.includes('main propre')
  }

  const handDelivery = shippingMethod ? checkHandDelivery(shippingMethod.name) : false

  // Détecter l'icône du transporteur
  const getShippingIcon = (methodName: string): string => {
    const name = methodName.toLowerCase()
    if (checkHandDelivery(name)) return '🤝'
    if (name.includes('mondial') || name.includes('relay')) return '📮'
    if (name.includes('chronopost')) return '⚡'
    if (name.includes('colissimo')) return '📦'
    return '🚚'
  }

  // Adresse formatée - Si point relais, on affiche seulement nom/prénom + téléphone
  const addressLines: string[] = []
  if (shippingAddress) {
    const fullName = `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim()
    if (fullName) addressLines.push(fullName)
    
    // Si pas de point relais, afficher l'adresse complète
    if (!relayPoint) {
      if (shippingAddress.address1) addressLines.push(shippingAddress.address1)
      if (shippingAddress.address2) addressLines.push(shippingAddress.address2)
      const cityParts: string[] = []
      if (shippingAddress.postalCode) cityParts.push(shippingAddress.postalCode)
      if (shippingAddress.city) cityParts.push(shippingAddress.city)
      if (shippingAddress.province) cityParts.push(shippingAddress.province)
      const cityLine = cityParts.join(' ')
      if (cityLine) addressLines.push(cityLine)
      if (shippingAddress.countryCode) addressLines.push(shippingAddress.countryCode.toUpperCase())
    }
    
    // Toujours afficher le téléphone et email
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
      ...(shippingMethod ? [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${getShippingIcon(shippingMethod.name)} Mode de livraison:*\n${shippingMethod.name} (${formatAmount(shippingMethod.amount, currencyCode)})`,
          },
        },
      ] : []),
      ...(relayPoint ? [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${shippingMethod?.name?.toLowerCase().includes('chrono') ? '⚡ Point Chronopost' : '📮 Point Relais'} sélectionné:*\n*${relayPoint.name}*\n${relayPoint.address}\n${relayPoint.postalCode} ${relayPoint.city}`,
          },
        },
      ] : []),
      ...(handDelivery && handDeliveryZone ? [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🤝 Remise en main propre :*\nSecteur choisi par le client : *${handDeliveryZone}*\n_Les instructions de retrait seront envoyées par mail._`,
          },
        },
      ] : []),
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
            text: relayPoint 
              ? `*👤 Client:*\n${addressLines.join('\n')}`
              : `*📍 Adresse de Livraison:*\n${addressLines.join('\n')}`,
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
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👁️ Voir la Commande',
              emoji: true,
            },
            url: `https://medusabackend-production-e0e9.up.railway.app/app/orders/${orderId}`,
            style: 'primary',
          },
          handDelivery ? {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🤝 Confirmer la remise',
              emoji: true,
            },
            url: `https://gomgombonbons.com/fr/ship-order/${orderId}`,
            style: 'primary',
          } : {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📦 Expédier',
              emoji: true,
            },
            url: `https://gomgombonbons.com/fr/ship-order/${orderId}`,
            style: 'primary',
          },
          ...(!handDelivery && orderUrl ? [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🖨️ Imprimer Étiquette',
                emoji: true,
              },
              url: orderUrl,
            },
          ] : []),
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
 * Envoie une notification Slack "commande expédiée / remise confirmée"
 */
export async function sendShippedNotificationToSlack(params: {
  orderId: string
  displayId: string
  customerEmail: string
  customerName?: string
  isHandDelivery: boolean
  handDeliveryZone?: string
  trackingNumber?: string
  carrier?: string
  trackingUrl?: string
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const { orderId, displayId, customerEmail, customerName, isHandDelivery, handDeliveryZone, trackingNumber, carrier, trackingUrl } = params

  const blocks = isHandDelivery ? [
    {
      type: 'header',
      text: { type: 'plain_text', text: `✅ Remise confirmée — Commande #${displayId}`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Client :*\n${customerName || customerEmail}` },
        { type: 'mrkdwn', text: `*Secteur :*\n${handDeliveryZone || 'Non précisé'}` },
      ],
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `🤝 Remise en main propre effectuée · ${customerEmail}` }],
    },
  ] : [
    {
      type: 'header',
      text: { type: 'plain_text', text: `✅ Expédiée — Commande #${displayId}`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Client :*\n${customerName || customerEmail}` },
        { type: 'mrkdwn', text: `*Transporteur :*\n${carrier || 'N/A'}` },
      ],
    },
    ...(trackingNumber ? [{
      type: 'section',
      text: { type: 'mrkdwn', text: `*Numéro de suivi :*\n\`${trackingNumber}\`${trackingUrl ? `\n<${trackingUrl}|Voir le suivi>` : ''}` },
    }] : []),
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `📦 Colis envoyé · ${customerEmail}` }],
    },
  ]

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })
    logger.info(`✅ [SLACK] Notification expédition envoyée pour commande #${displayId}`)
  } catch (error) {
    const err = error as Error | undefined
    logger.error(`❌ [SLACK] Erreur notification expédition: ${err?.message || "unknown"}`)
  }
}

/**
 * Envoie la notification Slack
 */
export async function sendOrderNotificationToSlack(data: OrderNotificationData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    logger.warn('⚠️ [SLACK] SLACK_WEBHOOK_URL non configuré, notification ignorée')
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

    logger.info(`✅ [SLACK] Notification envoyée pour commande #${data.displayId}`)
  } catch (error) {
    const err = error as Error | undefined
    logger.error(`❌ [SLACK] Erreur envoi notification: ${err?.message || "unknown"}`)
    // Ne pas bloquer le flux si Slack échoue
  }
}
