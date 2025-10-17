# 🚚 Livraison Dynamique - Comment ça marche

## 📁 Fichiers (3 seulement)

```
src/
├── modules/
│   ├── dynamic-shipping/
│   │   ├── types.ts          # Types TypeScript
│   │   ├── rates.ts          # Grille tarifaire (TES PRIX)
│   │   ├── service.ts        # Calcul des frais
│   │   └── index.ts          # Exports
│   └── dynamic-shipping-provider/
│       └── index.ts          # Provider Medusa (connecte tout)
```

## 🔄 Comment ça fonctionne

### 1️⃣ Dans l'admin Medusa

Tu crées des **Shipping Options** normalement :

**Région France** :
- Option "Mondial Relay" → Provider: `dynamic-shipping` → Prix: 5.99€ (sera recalculé)
- Option "Colissimo" → Provider: `dynamic-shipping` → Prix: 8.70€ (sera recalculé)
- Option "Chronopost" → Provider: `dynamic-shipping` → Prix: 7.99€ (sera recalculé)

Le prix que tu mets est **ignoré**, le provider calcule le vrai prix.

### 2️⃣ Dans ton frontend

**Tu utilises l'API Medusa STANDARD** (rien de custom) :

```typescript
// 1. Récupérer les options disponibles
const response = await fetch(
  `${BACKEND_URL}/store/shipping-options/${cartId}`
);
const { shipping_options } = await response.json();

// 2. Pour chaque option avec price_type="calculated", calculer le prix
for (const option of shipping_options) {
  if (option.price_type === "calculated") {
    const priceResponse = await fetch(
      `${BACKEND_URL}/store/shipping-options/${option.id}/calculate`,
      {
        method: "POST",
        body: JSON.stringify({ cart_id: cartId })
      }
    );
    const { calculated_amount } = await priceResponse.json();
    // calculated_amount = le prix calculé par ton provider
  }
}

// 3. Quand le client choisit, tu l'ajoutes au cart
await fetch(`${BACKEND_URL}/store/carts/${cartId}/shipping-methods`, {
  method: "POST",
  body: JSON.stringify({
    option_id: selectedOption.id
  })
});
```

### 3️⃣ Ce qui se passe dans le backend

Quand le frontend appelle `/store/shipping-options/{id}/calculate` :

1. Medusa appelle ton provider `calculatePrice()`
2. Ton provider :
   - Récupère le poids des items du cart
   - Récupère le pays de livraison
   - Regarde dans `rates.ts` quel est le bon prix
   - Applique la livraison gratuite si >= 40€ (Mondial Relay France)
   - Retourne le prix calculé
3. Medusa renvoie le prix au frontend

**C'EST TOUT.** Pas d'API custom, pas de subscriber, rien.

## ⚙️ Configuration

### Étape 1 : Ajouter les poids aux produits

Dans l'admin, pour chaque produit → Variants → Weight (en kg)

Exemple : `0.5` pour 500g

### Étape 2 : Créer les régions

Settings → Regions :
- France (FR)
- DOM-TOM (GP, MQ, GF, RE, YT, etc.)
- Europe (BE, LU, NL, ES, PT, IT, etc.)
- International (tous les autres)

### Étape 3 : Créer les shipping options

Pour chaque région, créer les options :

**France** :
- Mondial Relay → Provider: `dynamic-shipping`
- Colissimo → Provider: `dynamic-shipping`
- Chronopost Relais → Provider: `dynamic-shipping`

**DOM-TOM** :
- Colissimo DOM-TOM → Provider: `dynamic-shipping`

**Europe** :
- Mondial Relay Europe → Provider: `dynamic-shipping`
- Colissimo Europe → Provider: `dynamic-shipping`

**International** :
- Colissimo International → Provider: `dynamic-shipping`

### Étape 4 : Redémarrer

```bash
npm run dev
```

## 💰 Modifier les tarifs

Édite `src/modules/dynamic-shipping/rates.ts` :

```typescript
{
  carrier: 'mondial-relay',
  region: 'france-metro',
  freeShippingThreshold: 4000, // 40€ en centimes
  brackets: [
    { minWeight: 0, maxWeight: 2, price: 599 },  // 5,99€
    { minWeight: 2, maxWeight: 5, price: 799 },  // 7,99€
    { minWeight: 5, maxWeight: 10, price: 1099 }, // 10,99€
  ],
}
```

## 🎯 Grille tarifaire

### France Métropolitaine
- **Mondial Relay** : 5,99€ / 7,99€ / 10,99€ → **GRATUIT dès 40€**
- **Colissimo** : 8,70€ / 12,90€ / 16,90€
- **Chronopost** : 7,99€ (jusqu'à 5kg)

### DOM-TOM
- **Colissimo** : 12,35€ / 18,90€ / 28,90€ / 39,90€

### Europe
- **Mondial Relay** : 6,99€ / 8,30€ / 9,30€
- **Colissimo** : 18,45€ / 25,90€ / 32,90€

### Monde
- **Colissimo** : 32,20€ / 45,90€ / 62,90€

## 🔍 Comment le provider détermine le transporteur

Dans `dynamic-shipping-provider/index.ts`, ligne 85-91 :

```typescript
// Le provider regarde le NOM de la shipping option
const optionId = optionData.id || 'mondial-relay-fr';
let carrier = 'mondial-relay';

if (optionId.includes('colissimo')) {
  carrier = 'colissimo';
} else if (optionId.includes('chronopost')) {
  carrier = 'chronopost';
}
```

**Important** : Nomme tes shipping options avec le nom du transporteur dedans :
- ✅ "Mondial Relay" → détecté comme `mondial-relay`
- ✅ "Colissimo DOM-TOM" → détecté comme `colissimo`
- ✅ "Chronopost Relais" → détecté comme `chronopost`

## 🐛 Problèmes courants

**Les frais ne changent pas ?**
→ Vérifie que les poids sont définis sur les produits

**Livraison gratuite ne marche pas ?**
→ Vérifie que le total >= 40€ et que c'est Mondial Relay en France

**Option non disponible ?**
→ Vérifie que le poids ne dépasse pas la limite du transporteur

## 📞 Communication Frontend ↔ Backend

```
Frontend (Vercel)
    ↓
    GET /store/shipping-options/{cartId}
    ↓
Backend (Railway) → Medusa API standard
    ↓
    Appelle ton provider calculatePrice()
    ↓
    Retourne le prix calculé
    ↓
Frontend affiche les options avec les vrais prix
```

**Aucune API custom nécessaire.** Tout passe par l'API Medusa standard.
