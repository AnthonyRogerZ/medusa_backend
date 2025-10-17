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

// GRILLE TARIFAIRE COMPLÈTE
const SHIPPING_RATES: ShippingRates = {
  "mondial-relay": {
    "FR": {
      freeShippingThreshold: 4000, // 40€ en centimes
      brackets: [
        { minWeight: 0, maxWeight: 2, price: 599 },
        { minWeight: 2, maxWeight: 5, price: 799 },
        { minWeight: 5, maxWeight: 10, price: 1099 },
      ],
    },
    "BE": { brackets: [{ minWeight: 0, maxWeight: 5, price: 699 }] },
    "LU": { brackets: [{ minWeight: 0, maxWeight: 5, price: 699 }] },
    "NL": { brackets: [{ minWeight: 0, maxWeight: 5, price: 699 }] },
    "ES": { brackets: [{ minWeight: 0, maxWeight: 5, price: 830 }] },
    "PT": { brackets: [{ minWeight: 0, maxWeight: 5, price: 830 }] },
    "IT": { brackets: [{ minWeight: 0, maxWeight: 5, price: 930 }] },
    "PL": { brackets: [{ minWeight: 0, maxWeight: 5, price: 930 }] },
  },
  "colissimo": {
    "FR": {
      brackets: [
        { minWeight: 0, maxWeight: 2, price: 870 },
        { minWeight: 2, maxWeight: 5, price: 1290 },
        { minWeight: 5, maxWeight: 10, price: 1690 },
      ],
    },
    "GP": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "MQ": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "GF": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "RE": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    "YT": { brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ]},
    // Europe
    "BE": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "LU": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "NL": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "ES": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "PT": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "IT": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "PL": { brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ]},
    "DE": { brackets: [
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
    "FR": {
      brackets: [{ minWeight: 0, maxWeight: 5, price: 799 }],
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
      console.log("📦 Context:", JSON.stringify(context, null, 2))

      // 1. Récupérer les items du cart
      const items = context.items || []
      
      // 2. Calculer le poids total (en kg)
      const totalWeight = items.reduce((sum: number, item: any) => {
        const weight = item.variant?.weight || 0.5 // 500g par défaut
        return sum + (weight * Number(item.quantity))
      }, 0)

      console.log(`⚖️ Poids total: ${totalWeight}kg`)

      // 3. Récupérer le pays de livraison
      const countryCode = context.shipping_address?.country_code || "FR"
      console.log(`🌍 Pays: ${countryCode}`)

      // 4. Déterminer le transporteur depuis le nom de l'option
      const optionName = String(optionData.name || "").toLowerCase()
      let carrier = "mondial-relay"
      
      if (optionName.includes("colissimo")) {
        carrier = "colissimo"
      } else if (optionName.includes("chronopost")) {
        carrier = "chronopost"
      }

      console.log(`🚛 Transporteur: ${carrier}`)

      // 5. Récupérer les tarifs pour ce transporteur et ce pays
      const carrierRates = SHIPPING_RATES[carrier]
      if (!carrierRates) {
        console.error(`❌ Pas de tarifs pour ${carrier}`)
        return {
          calculated_amount: 999,
          is_calculated_price_tax_inclusive: false,
        }
      }

      const countryRates = carrierRates[countryCode] || carrierRates["default"]
      if (!countryRates) {
        console.error(`❌ Pas de tarifs pour ${carrier} vers ${countryCode}`)
        return {
          calculated_amount: 999,
          is_calculated_price_tax_inclusive: false,
        }
      }

      // 6. Trouver la tranche de poids correspondante
      const bracket = countryRates.brackets.find(
        b => totalWeight >= b.minWeight && totalWeight <= b.maxWeight
      )

      if (!bracket) {
        console.error(`❌ Poids ${totalWeight}kg hors limites pour ${carrier}`)
        return {
          calculated_amount: 999999, // Prix très élevé pour indiquer que c'est impossible
          is_calculated_price_tax_inclusive: false,
        }
      }

      let finalPrice = bracket.price

      // 7. Vérifier la livraison gratuite (Mondial Relay France uniquement)
      if (countryRates.freeShippingThreshold) {
        const cartTotal = (context.cart as any)?.total || 0
        if (cartTotal >= countryRates.freeShippingThreshold) {
          finalPrice = 0
          console.log(`🎁 Livraison gratuite! (total: ${cartTotal/100}€)`)
        }
      }

      console.log(`💰 Prix calculé: ${finalPrice/100}€`)

      return {
        calculated_amount: finalPrice,
        is_calculated_price_tax_inclusive: false,
      }

    } catch (error) {
      console.error("❌ Erreur dans calculatePrice:", error)
      return {
        calculated_amount: 999,
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
