export type ShippingRegion = 
  | 'france-metro'
  | 'dom-tom'
  | 'europe-benelux'
  | 'europe-iberia'
  | 'europe-other'
  | 'world';

export type ShippingCarrier = 
  | 'mondial-relay'
  | 'colissimo'
  | 'chronopost';

export interface WeightBracket {
  minWeight: number;
  maxWeight: number;
  price: number;
}

export interface ShippingRate {
  carrier: ShippingCarrier;
  region: ShippingRegion;
  brackets: WeightBracket[];
  freeShippingThreshold?: number; // Montant minimum pour livraison gratuite
}

export interface ShippingCalculationInput {
  weight: number; // en kg
  region: ShippingRegion;
  carrier: ShippingCarrier;
  cartTotal?: number; // Pour la livraison gratuite
}

export interface ShippingCalculationResult {
  price: number;
  isFree: boolean;
  carrier: ShippingCarrier;
  region: ShippingRegion;
  weight: number;
}
