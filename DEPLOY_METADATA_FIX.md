# 🚀 Déploiement du Fix Métadonnées Order Notes

## ✅ Modifications Effectuées

**Fichier modifié:** `/src/subscribers/order-placed.ts`

**Changements:**
- ✅ Ajout de logging diagnostique complet (lignes 56-95)
- ✅ Identification de la cause: `cart_id` probablement null ou métadonnées vides
- ✅ Logs détaillés à chaque étape pour diagnostiquer le problème

## 📝 Nouveaux Logs Attendus

Après le déploiement, lors d'une nouvelle commande, vous verrez dans Railway:

```
🔍 [METADATA] Début copie métadonnées pour order order_XXX
🔍 [METADATA] cart_id: cart_XXX
🔍 [METADATA] order.metadata: {}
🔍 [METADATA] cart_id trouvé, récupération du cart...
🔍 [METADATA] Cart récupéré: OUI
🔍 [METADATA] cart.metadata: {"order_notes":"..."}
🔍 [METADATA] Métadonnées trouvées, mise à jour de l'order...
✅ [METADATA] Métadonnées copiées du cart vers l'order order_XXX
📝 [METADATA] order_notes: Merci de séparer les bonbons...
```

**OU** si le problème persiste:

```
🔍 [METADATA] Début copie métadonnées pour order order_XXX
🔍 [METADATA] cart_id: NULL/UNDEFINED
⚠️ [METADATA] Pas de cart_id dans l'order, impossible de copier les métadonnées
```

## 🔄 Étapes de Déploiement sur Railway

### 1. Vérifier l'état Git

```bash
cd /home/anthony/Documents/medusa-backend
git status
```

### 2. Commiter les changements

```bash
git add src/subscribers/order-placed.ts
git commit -m "🔧 Ajout logging diagnostique pour copie metadata cart->order"
```

### 3. Pusher vers le repo

```bash
git push origin main
# ou: git push origin master
```

### 4. Railway redéploiera automatiquement

Railway détecte le push Git et redéploie automatiquement.

**OU** déployer manuellement:

1. Aller sur [Railway Dashboard](https://railway.app)
2. Sélectionner le projet `medusabackend-production`
3. Cliquer sur **Deploy** ou **Redeploy**

### 5. Vérifier le déploiement

Attendre que le build termine (2-3 minutes):
- Status: **Building** → **Deploying** → **Active**

### 6. Tester avec une nouvelle commande

1. Aller sur le frontend
2. Créer un panier
3. Ajouter des `order_notes` dans le checkout
4. Finaliser la commande
5. **Vérifier les logs Railway immédiatement**

### 7. Consulter les logs Railway

```bash
# Dans le Dashboard Railway, section Logs
# OU via CLI:
railway logs
```

Chercher les logs avec `[METADATA]`:

```bash
railway logs | grep METADATA
```

## 🔍 Diagnostic des Scénarios

### Scénario 1: cart_id est NULL

**Logs:**
```
🔍 [METADATA] cart_id: NULL/UNDEFINED
⚠️ [METADATA] Pas de cart_id dans l'order
```

**Cause:** Medusa ne lie pas le `cart_id` à l'order lors de `cart.complete()`

**Solution:** Récupérer le cart AVANT la completion côté frontend et passer les métadonnées directement

---

### Scénario 2: cart.metadata est vide

**Logs:**
```
🔍 [METADATA] cart_id: cart_XXX
🔍 [METADATA] Cart récupéré: OUI
🔍 [METADATA] cart.metadata: {}
⚠️ [METADATA] Pas de métadonnées dans le cart
```

**Cause:** Les métadonnées ne sont pas sauvegardées côté frontend OU le cart est vidé avant la récupération

**Solution:** Vérifier que `updateCart()` est appelé avec les métadonnées AVANT `placeOrder()`

---

### Scénario 3: Erreur lors de la récupération du cart

**Logs:**
```
🔍 [METADATA] cart_id: cart_XXX
🔍 [METADATA] Cart récupéré: NON
```

**Cause:** Le cart n'existe plus ou problème de query

**Solution:** Le cart est probablement supprimé après `cart.complete()` - récupérer AVANT

---

### Scénario 4: Erreur lors de updateOrders()

**Logs:**
```
🔍 [METADATA] Métadonnées trouvées, mise à jour de l'order...
❌ [METADATA] Erreur copie métadonnées: ...
```

**Cause:** Permissions ou problème API Medusa

**Solution:** Vérifier les permissions du orderModuleService

---

### Scénario 5: Tout fonctionne ✅

**Logs:**
```
✅ [METADATA] Métadonnées copiées
📝 [METADATA] order_notes: Merci de séparer...
```

**Vérification finale:** Aller dans Medusa Admin → Orders → Vérifier le champ Metadata

## 🎯 Checklist Post-Déploiement

- [ ] Code commité et pushé
- [ ] Railway a redéployé (status Active)
- [ ] Nouvelle commande créée avec `order_notes`
- [ ] Logs Railway vérifiés
- [ ] Diagnostic du scénario identifié
- [ ] Métadonnées visibles dans Medusa Admin (si Scénario 5)

## 📞 Contact

Si les logs montrent un scénario autre que 5, partager les logs complets pour diagnostic approfondi.
