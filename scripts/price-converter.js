#!/usr/bin/env node

// Script pour convertir euros -> centimes pour Medusa
// Usage: node scripts/price-converter.js 2.44
// Output: 244

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node scripts/price-converter.js <prix_en_euros>');
  console.log('Exemple: node scripts/price-converter.js 2.44');
  console.log('         → 244 (centimes pour Medusa)');
  process.exit(1);
}

const priceInEuros = parseFloat(args[0]);

if (isNaN(priceInEuros)) {
  console.error('Erreur: Prix invalide');
  process.exit(1);
}

const priceInCents = Math.round(priceInEuros * 100);

console.log(`${priceInEuros}€ = ${priceInCents} centimes`);
console.log(`👉 Saisir dans Medusa: ${priceInCents}`);
