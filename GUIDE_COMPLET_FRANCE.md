# 🇫🇷 GUIDE COMPLET - Configuration Livraison France

## ✅ ÉTAPE 1 : Vérifier que le serveur a démarré

1. Va sur Railway : https://railway.app
2. Clique sur ton projet `medusa-backend`
3. Regarde les logs
4. Cherche cette ligne :
   ```
   ✔ Modules initialized
   ```

Si tu vois des erreurs, envoie-moi les logs.

---

## ✅ ÉTAPE 2 : Vérifier que le provider existe

1. Va dans l'admin Medusa : https://medusabackend-production-e0e9.up.railway.app/app
2. Connecte-toi
3. Va dans **Settings** (en bas à gauche)
4. Clique sur **Locations**
5. Clique sur une location (ex: "Entrepôt Principal")
6. Scroll jusqu'à **Fulfillment Providers**
7. Tu dois voir : `fp_dynamic-shipping_dynamic-shipping`

**Si tu ne le vois PAS** → Le provider n'est pas chargé, il y a un problème.

---

## ✅ ÉTAPE 3 : Activer le provider sur ta location

1. Dans **Settings** → **Locations**
2. Clique sur "Entrepôt Principal" (ou ta location principale)
3. Dans **Fulfillment Providers**, clique sur **Edit**
4. Coche `fp_dynamic-shipping_dynamic-shipping`
5. Save

---

## ✅ ÉTAPE 4 : Créer la région France

1. Va dans **Settings** → **Regions**
2. Clique **Create Region**
3. Remplis :
   - **Name** : `France`
   - **Currency** : `EUR`
   - **Countries** : Sélectionne `France`
   - **Tax Rate** : `20` (optionnel)
4. Clique **Create**

---

## ✅ ÉTAPE 5 : Créer les shipping options pour la France

### Option 1 : Mondial Relay

1. Clique sur la région **France** que tu viens de créer
2. Va dans l'onglet **Shipping Options**
3. Clique **Add Shipping Option**
4. Remplis :
   - **Name** : `Mondial Relay`
   - **Shipping Profile** : `Default Shipping Profile`
   - **Provider** : Sélectionne `fp_dynamic-shipping_dynamic-shipping`
   - **Price Type** : Sélectionne `Calculated`
   - **Fulfillment Method** : Sélectionne `mondial-relay`
5. Clique **Save**

### Option 2 : Colissimo

1. Clique **Add Shipping Option** (encore)
2. Remplis :
   - **Name** : `Colissimo`
   - **Shipping Profile** : `Default Shipping Profile`
   - **Provider** : Sélectionne `fp_dynamic-shipping_dynamic-shipping`
   - **Price Type** : Sélectionne `Calculated`
   - **Fulfillment Method** : Sélectionne `colissimo`
3. Clique **Save**

### Option 3 : Chronopost

1. Clique **Add Shipping Option** (encore)
2. Remplis :
   - **Name** : `Chronopost`
   - **Shipping Profile** : `Default Shipping Profile`
   - **Provider** : Sélectionne `fp_dynamic-shipping_dynamic-shipping`
   - **Price Type** : Sélectionne `Calculated`
   - **Fulfillment Method** : Sélectionne `chronopost`
3. Clique **Save**

---

## ✅ ÉTAPE 6 : Ajouter les poids aux produits

1. Va dans **Products**
2. Clique sur un produit
3. Clique sur **Edit**
4. Va dans l'onglet **Variants**
5. Pour chaque variante :
   - Clique sur **Edit**
   - Scroll jusqu'à **Dimensions**
   - Remplis **Weight** en kg (ex: `0.5` pour 500g)
   - Clique **Save**

**Exemple** :
- Bonbon 100g → Weight: `0.1`
- Bonbon 250g → Weight: `0.25`
- Bonbon 500g → Weight: `0.5`
- Bonbon 1kg → Weight: `1`

---

## ✅ ÉTAPE 7 : Tester

### Dans l'admin (pour tester)

1. Va dans **Orders**
2. Clique **Create Draft Order**
3. Ajoute des produits
4. Ajoute une adresse en France
5. Clique sur **Shipping**
6. Tu dois voir les 3 options avec les prix calculés automatiquement :
   - Mondial Relay : 5,99€ (si < 2kg)
   - Colissimo : 8,70€ (si < 2kg)
   - Chronopost : 7,99€

### Depuis le frontend (API)

```bash
# 1. Créer un cart
curl -X POST https://medusabackend-production-e0e9.up.railway.app/store/carts

# 2. Ajouter des produits au cart
curl -X POST https://medusabackend-production-e0e9.up.railway.app/store/carts/{cart_id}/line-items \
  -H "Content-Type: application/json" \
  -d '{"variant_id": "variant_xxx", "quantity": 2}'

# 3. Ajouter une adresse
curl -X POST https://medusabackend-production-e0e9.up.railway.app/store/carts/{cart_id} \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 rue de Paris",
      "city": "Paris",
      "country_code": "fr",
      "postal_code": "75001"
    }
  }'

# 4. Récupérer les shipping options
curl https://medusabackend-production-e0e9.up.railway.app/store/shipping-options?cart_id={cart_id}

# 5. Calculer le prix d'une option
curl -X POST https://medusabackend-production-e0e9.up.railway.app/store/shipping-options/{option_id}/calculate \
  -H "Content-Type: application/json" \
  -d '{"cart_id": "{cart_id}"}'
```

---

## 🐛 Si ça ne marche pas

### Le provider n'apparaît pas dans la liste

**Problème** : Le serveur n'a pas chargé le module.

**Solution** :
1. Regarde les logs Railway
2. Cherche des erreurs de type "moduleProviderServices is not iterable"
3. Envoie-moi les logs

### Les prix ne sont pas calculés

**Problème** : Les produits n'ont pas de poids.

**Solution** :
1. Vérifie que TOUS les produits ont un poids
2. Regarde les logs du serveur, tu dois voir :
   ```
   🚚 [Dynamic Shipping] calculatePrice called
   ⚖️ Poids total: 1.5kg
   🌍 Pays: FR
   🚛 Transporteur: mondial-relay
   💰 Prix calculé: 5.99€
   ```

### L'option n'est pas disponible

**Problème** : Le poids dépasse la limite du transporteur.

**Solution** :
1. Vérifie le poids total du panier
2. Mondial Relay max 10kg
3. Colissimo max 10kg
4. Chronopost max 5kg

---

## 📞 Besoin d'aide ?

Envoie-moi :
1. Les logs Railway (dernières 50 lignes)
2. Une capture d'écran de Settings → Locations → Fulfillment Providers
3. Une capture d'écran de la région France → Shipping Options
