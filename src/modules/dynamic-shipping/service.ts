import { 
  ShippingCalculationInput, 
  ShippingCalculationResult, 
  ShippingRegion,
  ShippingCarrier 
} from './types';
import { SHIPPING_RATES, COUNTRY_TO_REGION } from './rates';

export class DynamicShippingService {
  /**
   * Calcule les frais de livraison en fonction du poids, région et transporteur
   */
  calculateShipping(input: ShippingCalculationInput): ShippingCalculationResult {
    const { weight, region, carrier, cartTotal = 0 } = input;

    // Trouver le tarif correspondant
    const rate = SHIPPING_RATES.find(
      r => r.carrier === carrier && r.region === region
    );

    if (!rate) {
      throw new Error(
        `No shipping rate found for carrier ${carrier} and region ${region}`
      );
    }

    // Trouver la tranche de poids correspondante
    const bracket = rate.brackets.find(
      b => weight >= b.minWeight && weight <= b.maxWeight
    );

    if (!bracket) {
      throw new Error(
        `Weight ${weight}kg exceeds maximum allowed weight for ${carrier} in ${region}`
      );
    }

    // Vérifier si livraison gratuite
    const isFree = 
      rate.freeShippingThreshold !== undefined && 
      cartTotal >= rate.freeShippingThreshold;

    return {
      price: isFree ? 0 : bracket.price,
      isFree,
      carrier,
      region,
      weight,
    };
  }

  /**
   * Récupère toutes les options de livraison disponibles pour une région et un poids donnés
   */
  getAvailableShippingOptions(
    countryCode: string, 
    weight: number, 
    cartTotal: number = 0
  ): ShippingCalculationResult[] {
    const region = this.getRegionFromCountryCode(countryCode);
    
    // Filtrer les tarifs disponibles pour cette région
    const availableRates = SHIPPING_RATES.filter(r => r.region === region);
    
    const options: ShippingCalculationResult[] = [];

    for (const rate of availableRates) {
      try {
        const result = this.calculateShipping({
          weight,
          region,
          carrier: rate.carrier,
          cartTotal,
        });
        options.push(result);
      } catch (error) {
        // Si le poids dépasse la limite pour ce transporteur, on l'ignore
        continue;
      }
    }

    // Trier par prix croissant
    return options.sort((a, b) => a.price - b.price);
  }

  /**
   * Convertit un code pays ISO en région de livraison
   */
  getRegionFromCountryCode(countryCode: string): ShippingRegion {
    const region = COUNTRY_TO_REGION[countryCode.toUpperCase()];
    
    if (!region) {
      // Par défaut, considérer comme "monde"
      return 'world';
    }
    
    return region as ShippingRegion;
  }

  /**
   * Calcule le poids total d'un panier
   */
  calculateCartWeight(items: Array<{ weight?: number; quantity: number }>): number {
    return items.reduce((total, item) => {
      const itemWeight = item.weight || 0; // Poids en kg
      return total + (itemWeight * item.quantity);
    }, 0);
  }

  /**
   * Récupère le nom lisible d'un transporteur
   */
  getCarrierName(carrier: ShippingCarrier): string {
    const names: Record<ShippingCarrier, string> = {
      'mondial-relay': 'Mondial Relay',
      'colissimo': 'Colissimo',
      'chronopost': 'Chronopost Relais',
    };
    return names[carrier] || carrier;
  }

  /**
   * Récupère le délai de livraison estimé
   */
  getEstimatedDeliveryTime(carrier: ShippingCarrier, region: ShippingRegion): string {
    if (carrier === 'chronopost') {
      return '48h';
    }
    
    if (region === 'france-metro') {
      return carrier === 'mondial-relay' ? '3-5 jours' : '2-3 jours';
    }
    
    if (region === 'dom-tom') {
      return '5-10 jours';
    }
    
    if (region.startsWith('europe')) {
      return '4-7 jours';
    }
    
    return '7-15 jours';
  }
}
