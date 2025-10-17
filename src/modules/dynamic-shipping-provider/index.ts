import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import { DynamicShippingService } from "../dynamic-shipping/service";

type InjectedDependencies = {
  // Ajoutez vos dépendances ici si nécessaire
};

interface DynamicShippingProviderOptions {
  // Options de configuration si nécessaire
}

class DynamicShippingProviderService extends AbstractFulfillmentProviderService {
  static identifier = "dynamic-shipping";
  
  protected shippingService: DynamicShippingService;

  constructor(
    container: InjectedDependencies,
    options?: DynamicShippingProviderOptions
  ) {
    // @ts-ignore - Medusa v2 compatibility
    super();
    this.shippingService = new DynamicShippingService();
  }

  async getFulfillmentOptions(): Promise<any[]> {
    return [
      {
        id: "mondial-relay-fr",
        name: "Mondial Relay",
        description: "Livraison en point relais (France)",
      },
      {
        id: "colissimo-fr",
        name: "Colissimo",
        description: "Livraison à domicile",
      },
      {
        id: "chronopost-fr",
        name: "Chronopost Relais",
        description: "Livraison express 48h",
      },
    ];
  }

  async validateFulfillmentData(
    optionData: any,
    data: any,
    context: any
  ): Promise<any> {
    return {
      ...data,
    };
  }

  async validateOption(data: any): Promise<boolean> {
    return true;
  }

  async canCalculate(data: any): Promise<boolean> {
    return true;
  }

  async calculatePrice(
    optionData: any,
    data: any,
    context: any
  ): Promise<any> {
    try {
      // Extraire les informations nécessaires
      const { items = [], shipping_address } = context.cart || {};
      const countryCode = shipping_address?.country_code || 'FR';
      
      // Calculer le poids total
      const weight = this.shippingService.calculateCartWeight(
        items.map((item: any) => ({
          weight: item.variant?.weight || 0.5, // Poids par défaut 500g
          quantity: item.quantity,
        }))
      );

      // Calculer le total du panier
      const cartTotal = context.cart?.total || 0;

      // Déterminer le transporteur depuis l'option
      const optionId = optionData.id || 'mondial-relay-fr';
      let carrier: 'mondial-relay' | 'colissimo' | 'chronopost' = 'mondial-relay';
      
      if (optionId.includes('colissimo')) {
        carrier = 'colissimo';
      } else if (optionId.includes('chronopost')) {
        carrier = 'chronopost';
      }

      // Obtenir la région
      const region = this.shippingService.getRegionFromCountryCode(countryCode);

      // Calculer le prix
      const result = this.shippingService.calculateShipping({
        weight,
        region,
        carrier,
        cartTotal,
      });

      // Return in Medusa v2 format
      return {
        calculated_amount: result.price,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error) {
      console.error('Error calculating shipping price:', error);
      // Retourner un prix par défaut en cas d'erreur
      return {
        calculated_amount: 599, // 5,99€
        is_calculated_price_tax_inclusive: false,
      };
    }
  }

  async createFulfillment(
    data: any,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<any> {
    // Logique de création de fulfillment
    return {
      data: {
        ...data,
        tracking_number: null,
      },
    };
  }

  async cancelFulfillment(fulfillment: any): Promise<any> {
    return {};
  }

  async createReturn(returnOrder: any): Promise<any> {
    return {};
  }

  async getFulfillmentDocuments(data: any): Promise<any> {
    return [];
  }

  async getReturnDocuments(data: any): Promise<any> {
    return [];
  }

  async getShipmentDocuments(data: any): Promise<any> {
    return [];
  }

  async retrieveDocuments(
    fulfillmentData: any,
    documentType: any
  ): Promise<any> {
    return [];
  }
}

export default DynamicShippingProviderService;
