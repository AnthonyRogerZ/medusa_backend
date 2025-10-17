import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
  CalculateShippingOptionPriceDTO,
  CalculatedShippingOptionPrice,
  FulfillmentOption
} from "@medusajs/framework/types"

type ShippingRates = {
  [carrier: string]: {
    [region: string]: {
      brackets: Array<{ minWeight: number; maxWeight: number; price: number }>;
      freeShippingThreshold?: number;
    };
  };
}

// GRILLE TARIFAIRE COMPLÈTE (codes pays en minuscules)
const SHIPPING_RATES: ShippingRates = {
  "mondial-relay": {
    "fr": {
      freeShippingThreshold: 4000, // 40€ en centimes
      brackets: [
        { minWeight: 0, maxWeight: 2, price: 599 },
        { minWeight: 2, maxWeight: 5, price: 799 },
        { minWeight: 5, maxWeight: 10, price: 1099 },
      ],
    },
    "be": { brackets: [{ minWeight: 0, maxWeight: 5, price: 699 }] },
    "lu": { brackets: [{ minWeight: 0, maxWeight: 5, price: 699 }] },
    "nl": { brackets: [{ minWeight: 0, maxWeight: 5, price: 699 }] },
    "es": { brackets: [{ minWeight: 0, maxWeight: 5, price: 830 }] },
    "pt": { brackets: [{ minWeight: 0, maxWeight: 5, price: 830 }] },
    "it": { brackets: [{ minWeight: 0, maxWeight: 5, price: 930 }] },
    "pl": { brackets: [{ minWeight: 0, maxWeight: 5, price: 930 }] },
  },
  "colissimo": {
    "fr": {
      brackets: [
        { minWeight: 0, maxWeight: 2, price: 870 },
        { minWeight: 2, maxWeight: 5, price: 1290 },
        { minWeight: 5, maxWeight: 10, price: 1690 },
      ],
    },
    "gp": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "mq": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "gf": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "re": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "yt": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    // Europe
    "be": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "lu": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "nl": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "es": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "pt": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "it": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "pl": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "de": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    // Monde (par défaut)
    "default": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 3220 },
      { minWeight: 2, maxWeight: 5, price: 4590 },
      { minWeight: 5, maxWeight: 10, price: 6290 },
    ]},
  },
  "chronopost": {
    "fr": {
      brackets: [
        { minWeight: 0, maxWeight: 5, price: 799 }, // Chronopost Relais (48h) - max 5kg
      ],
    },
  },
}

class DynamicShippingService extends AbstractFulfillmentProviderService {
  static identifier = "dynamic-shipping"

  constructor(container: any, options?: Record<string, unknown>) {
    // @ts-ignore
    super()
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      { id: "mondial-relay" },
      { id: "colissimo" },
      { id: "chronopost" },
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<any> {
    return data
  }

  async validateOption(data: Record<string, any>): Promise<boolean> {
    return true
  }

  async canCalculate(data: any): Promise<boolean> {
    return true
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    try {
      console.log("🚚 [Dynamic Shipping] calculatePrice called")
      console.log("📦 optionData:", JSON.stringify(optionData, null, 2))
      console.log("📦 data:", JSON.stringify(data, null, 2))
      console.log("📦 context:", JSON.stringify(context, null, 2))

      // 1. Récupérer les items du cart
      const items = context.items || []
      console.log(`📦 Nombre d'items: ${items.length}`)
      
      // 2. Calculer le poids total (en kg)
      // Note: Medusa stocke le poids en GRAMMES dans la DB
      const totalWeight = items.reduce((sum: number, item: any) => {
        const weightInGrams = item.variant?.weight || 100 // 100g par défaut
        const weightInKg = weightInGrams / 1000 // Conversion grammes → kg
        console.log(`  - Item: ${item.title || 'Unknown'}, weight: ${weightInGrams}g (${weightInKg}kg), qty: ${item.quantity}`)
        return sum + (weightInKg * Number(item.quantity))
      }, 0)

      console.log(`⚖️ Poids total: ${totalWeight}kg`)

      // 3. Récupérer le pays de livraison (en minuscules)
      const countryCode = (context.shipping_address?.country_code || "fr").toLowerCase()
      console.log(`🌍 Pays: ${countryCode}`)

      // 4. Déterminer le transporteur depuis l'ID de l'option
      const optionId = String(optionData.id || "").toLowerCase()
      console.log(`📝 Option ID: "${optionId}"`)
      let carrier = "mondial-relay"
      
      if (optionId.includes("colissimo")) {
        carrier = "colissimo"
      } else if (optionId.includes("chronopost")) {
        carrier = "chronopost"
      } else if (optionId.includes("mondial")) {
        carrier = "mondial-relay"
      }

      console.log(`🚛 Transporteur détecté: ${carrier}`)

      // 5. Récupérer les tarifs pour ce transporteur et ce pays
      const carrierRates = SHIPPING_RATES[carrier]
      if (!carrierRates) {
        console.error(`❌ Pas de tarifs pour ${carrier}`)
        return {
          calculated_amount: 9.99,
          is_calculated_price_tax_inclusive: false,
        }
      }

      const countryRates = carrierRates[countryCode] || carrierRates["default"]
      if (!countryRates) {
        console.error(`❌ Pas de tarifs pour ${carrier} vers ${countryCode}`)
        return {
          calculated_amount: 9.99,
          is_calculated_price_tax_inclusive: false,
        }
      }

      // 6. Trouver la tranche de poids correspondante
      const bracket = countryRates.brackets.find(
        b => totalWeight >= b.minWeight && totalWeight <= b.maxWeight
      )

      if (!bracket) {
        console.error(`❌ Poids ${totalWeight}kg hors limites pour ${carrier} (max: 10kg)`)
        console.log(`⚠️ Commande trop lourde, ce transporteur ne sera pas disponible`)
        // Retourner null pour que cette option n'apparaisse pas du tout
        throw new Error(`Poids ${totalWeight}kg trop élevé pour ${carrier} (max: 10kg)`)
      }

      let finalPrice = bracket.price

      // 7. Vérifier la livraison gratuite (Mondial Relay France uniquement)
      if (countryRates.freeShippingThreshold) {
        const cartTotal = (context.cart as any)?.total || 0
        console.log(`💰 Total panier: ${cartTotal} centimes (${cartTotal/100}€), Seuil: ${countryRates.freeShippingThreshold} centimes`)
        if (cartTotal >= countryRates.freeShippingThreshold) {
          finalPrice = 0
          console.log(`🎁 Livraison gratuite! (total: ${cartTotal/100}€)`)
        }
      }

      // Convertir en euros avec décimales (au lieu de centimes)
      const priceInEuros = finalPrice / 100
      console.log(`💰 Prix calculé: ${priceInEuros}€`)

      return {
        calculated_amount: priceInEuros,
        is_calculated_price_tax_inclusive: false,
      }

    } catch (error) {
      console.error("❌ Erreur dans calculatePrice:", error)
      return {
        calculated_amount: 9.99,
        is_calculated_price_tax_inclusive: false,
      }
    }
  }

  async createFulfillment(): Promise<any> {
    return {
      data: {},
      labels: []
    }
  }

  async cancelFulfillment(): Promise<any> {
    return {}
  }

  async createReturnFulfillment(): Promise<any> {
    return {}
  }

  async getFulfillmentDocuments(): Promise<any> {
    return []
  }

  async getReturnDocuments(): Promise<any> {
    return []
  }

  async getShipmentDocuments(): Promise<any> {
    return []
  }

  async retrieveDocuments(): Promise<any> {
    return []
  }
}

export default DynamicShippingService
