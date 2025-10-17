import { ShippingRate } from './types';

/**
 * Configuration complète des tarifs de livraison
 */
export const SHIPPING_RATES: ShippingRate[] = [
  // ============================================
  // FRANCE MÉTROPOLITAINE
  // ============================================
  {
    carrier: 'mondial-relay',
    region: 'france-metro',
    freeShippingThreshold: 4000, // 40€ en centimes
    brackets: [
      { minWeight: 0, maxWeight: 2, price: 599 },
      { minWeight: 2, maxWeight: 5, price: 799 },
      { minWeight: 5, maxWeight: 10, price: 1099 },
    ],
  },
  {
    carrier: 'colissimo',
    region: 'france-metro',
    brackets: [
      { minWeight: 0, maxWeight: 2, price: 870 },
      { minWeight: 2, maxWeight: 5, price: 1290 },
      { minWeight: 5, maxWeight: 10, price: 1690 },
    ],
  },
  {
    carrier: 'chronopost',
    region: 'france-metro',
    brackets: [
      { minWeight: 0, maxWeight: 5, price: 799 },
    ],
  },

  // ============================================
  // DOM-TOM (Colissimo uniquement)
  // ============================================
  {
    carrier: 'colissimo',
    region: 'dom-tom',
    brackets: [
      { minWeight: 0, maxWeight: 1, price: 1235 },
      { minWeight: 1, maxWeight: 3, price: 1890 },
      { minWeight: 3, maxWeight: 5, price: 2890 },
      { minWeight: 5, maxWeight: 10, price: 3990 },
    ],
  },

  // ============================================
  // EUROPE - Mondial Relay
  // ============================================
  {
    carrier: 'mondial-relay',
    region: 'europe-benelux', // Belgique, Luxembourg, Pays-Bas
    brackets: [
      { minWeight: 0, maxWeight: 5, price: 699 },
    ],
  },
  {
    carrier: 'mondial-relay',
    region: 'europe-iberia', // Espagne, Portugal
    brackets: [
      { minWeight: 0, maxWeight: 5, price: 830 },
    ],
  },
  {
    carrier: 'mondial-relay',
    region: 'europe-other', // Italie, Pologne
    brackets: [
      { minWeight: 0, maxWeight: 5, price: 930 },
    ],
  },

  // ============================================
  // EUROPE - Colissimo
  // ============================================
  {
    carrier: 'colissimo',
    region: 'europe-benelux',
    brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ],
  },
  {
    carrier: 'colissimo',
    region: 'europe-iberia',
    brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ],
  },
  {
    carrier: 'colissimo',
    region: 'europe-other',
    brackets: [
      { minWeight: 0, maxWeight: 2, price: 1845 },
      { minWeight: 2, maxWeight: 5, price: 2590 },
      { minWeight: 5, maxWeight: 10, price: 3290 },
    ],
  },

  // ============================================
  // MONDE (Colissimo uniquement)
  // ============================================
  {
    carrier: 'colissimo',
    region: 'world',
    brackets: [
      { minWeight: 0, maxWeight: 2, price: 3220 },
      { minWeight: 2, maxWeight: 5, price: 4590 },
      { minWeight: 5, maxWeight: 10, price: 6290 },
    ],
  },
];

/**
 * Mapping des codes pays ISO vers les régions de livraison
 */
export const COUNTRY_TO_REGION: Record<string, string> = {
  // France métropolitaine
  'FR': 'france-metro',
  
  // DOM-TOM
  'GP': 'dom-tom', // Guadeloupe
  'MQ': 'dom-tom', // Martinique
  'GF': 'dom-tom', // Guyane
  'RE': 'dom-tom', // Réunion
  'YT': 'dom-tom', // Mayotte
  'PM': 'dom-tom', // Saint-Pierre-et-Miquelon
  'BL': 'dom-tom', // Saint-Barthélemy
  'MF': 'dom-tom', // Saint-Martin
  'WF': 'dom-tom', // Wallis-et-Futuna
  'PF': 'dom-tom', // Polynésie française
  'NC': 'dom-tom', // Nouvelle-Calédonie
  
  // Europe Benelux
  'BE': 'europe-benelux', // Belgique
  'LU': 'europe-benelux', // Luxembourg
  'NL': 'europe-benelux', // Pays-Bas
  
  // Europe Iberia
  'ES': 'europe-iberia', // Espagne
  'PT': 'europe-iberia', // Portugal
  
  // Europe Other
  'IT': 'europe-other', // Italie
  'PL': 'europe-other', // Pologne
  'DE': 'europe-other', // Allemagne
  'AT': 'europe-other', // Autriche
  'CH': 'europe-other', // Suisse
  'GB': 'europe-other', // Royaume-Uni
  'IE': 'europe-other', // Irlande
  'DK': 'europe-other', // Danemark
  'SE': 'europe-other', // Suède
  'NO': 'europe-other', // Norvège
  'FI': 'europe-other', // Finlande
  'CZ': 'europe-other', // République tchèque
  'HU': 'europe-other', // Hongrie
  'RO': 'europe-other', // Roumanie
  'BG': 'europe-other', // Bulgarie
  'GR': 'europe-other', // Grèce
  'HR': 'europe-other', // Croatie
  'SI': 'europe-other', // Slovénie
  'SK': 'europe-other', // Slovaquie
  'EE': 'europe-other', // Estonie
  'LV': 'europe-other', // Lettonie
  'LT': 'europe-other', // Lituanie
};
