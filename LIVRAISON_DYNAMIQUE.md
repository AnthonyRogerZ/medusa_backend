# 🚚 Livraison Dynamique - CALCUL AUTOMATIQUE

## ✅ Comment ça marche

Le système calcule **AUTOMATIQUEMENT** les frais de livraison selon :
- ⚖️ **Le poids total** du panier (somme des poids des produits)
- 🌍 **Le pays** de livraison
- 🚛 **Le transporteur** choisi
- 💰 **Le montant** du panier (livraison gratuite dès 40€ pour Mondial Relay France)

## 📋 Configuration dans l'admin

### 1️⃣ Ajouter les poids aux produits

**IMPORTANT** : Sans poids, le système utilise 0.5kg par défaut.

1. Va dans **Products**
2. Clique sur un produit
3. Va dans **Variants**
4. Édite chaque variante
5. Ajoute le **Weight** en kg (ex: `0.5` pour 500g)
6. Save

### 2️⃣ Créer les régions

Va dans **Settings** → **Regions** et crée :

**France**
- Countries: FR
- Currency: EUR

**DOM-TOM**
- Countries: GP, MQ, GF, RE, YT
- Currency: EUR

**Europe**
- Countries: BE, LU, NL, ES, PT, IT, PL, DE
- Currency: EUR

**International**
- Countries: Tous les autres
- Currency: EUR

### 3️⃣ Créer les shipping options

Pour chaque région, crée les options :

#### France

**Mondial Relay**
- Name: `Mondial Relay`
- Price Type: **Calculated** ← IMPORTANT
- Provider: `fp_dynamic-shipping_dynamic-shipping` ← IMPORTANT
- Shipping Profile: Default

**Colissimo**
- Name: `Colissimo`
- Price Type: **Calculated**
- Provider: `fp_dynamic-shipping_dynamic-shipping`

**Chronopost**
- Name: `Chronopost`
- Price Type: **Calculated**
- Provider: `fp_dynamic-shipping_dynamic-shipping`

#### DOM-TOM

**Colissimo DOM-TOM**
- Name: `Colissimo`
- Price Type: **Calculated**
- Provider: `fp_dynamic-shipping_dynamic-shipping`

#### Europe

**Mondial Relay Europe**
- Name: `Mondial Relay`
- Price Type: **Calculated**
- Provider: `fp_dynamic-shipping_dynamic-shipping`

**Colissimo Europe**
- Name: `Colissimo`
- Price Type: **Calculated**
- Provider: `fp_dynamic-shipping_dynamic-shipping`

#### International

**Colissimo International**
- Name: `Colissimo`
- Price Type: **Calculated**
- Provider: `fp_dynamic-shipping_dynamic-shipping`

## 💰 Grille tarifaire

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

## 🔧 Modifier les tarifs

Édite `src/modules/dynamic-shipping/service.ts` :

```typescript
const SHIPPING_RATES: ShippingRates = {
  "mondial-relay": {
    "FR": {
      freeShippingThreshold: 4000, // 40€ en centimes
      brackets: [
        { minWeight: 0, maxWeight: 2, price: 599 },  // 5,99€
        { minWeight: 2, maxWeight: 5, price: 799 },  // 7,99€
        { minWeight: 5, maxWeight: 10, price: 1099 }, // 10,99€
      ],
    },
  },
  // ...
}
```

## 🎯 Comment le frontend l'utilise

```typescript
// 1. Récupérer les options disponibles
const response = await fetch(
  `${BACKEND_URL}/store/shipping-options/${cartId}`
)
const { shipping_options } = await response.json()

// 2. Pour chaque option "calculated", calculer le prix
for (const option of shipping_options) {
  if (option.price_type === "calculated") {
    const priceResponse = await fetch(
      `${BACKEND_URL}/store/shipping-options/${option.id}/calculate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cartId })
      }
    )
    const { calculated_amount } = await priceResponse.json()
    // calculated_amount = le prix en centimes
  }
}

// 3. Afficher les options avec les vrais prix au client
```

## 🐛 Debug

Les logs apparaissent dans la console du serveur :

```
🚚 [Dynamic Shipping] calculatePrice called
⚖️ Poids total: 3.5kg
🌍 Pays: FR
🚛 Transporteur: mondial-relay
💰 Prix calculé: 7.99€
```

## ✅ Vérification

1. Crée un panier avec des produits qui ont des poids
2. Ajoute une adresse de livraison
3. Récupère les shipping options
4. Vérifie que les prix sont calculés automatiquement

**Le client ne choisit PAS le poids, le système calcule tout automatiquement !**
