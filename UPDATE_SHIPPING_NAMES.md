# 📦 Guide: Renommer les Options de Livraison

## ❌ Problème Actuel:
Les noms ne sont pas assez précis:
- "Chronopost" → Devrait être "Chronopost Relay 48h"
- "Mondial Relay" → OK ou à préciser si besoin
- "Colissimo" → OK ou à préciser si besoin

---

## ✅ Solution: Mettre à Jour dans Medusa Admin

### Étapes:

1. **Accéder à Medusa Admin:**
   ```
   https://medusabackend-production-e0e9.up.railway.app/app
   ```

2. **Navigation:**
   - Settings (⚙️) → Locations & Shipping
   - OU directement: Settings → Shipping Options

3. **Trouver les Options à Modifier:**
   - Chercher "Chronopost"
   - Cliquer sur l'option pour l'éditer

4. **Modifier le Nom:**
   ```
   Ancien nom: Chronopost
   Nouveau nom: Chronopost Relay 48h
   ```

5. **Sauvegarder:**
   - Cliquer sur "Save" / "Enregistrer"

---

## 📝 Noms Recommandés:

### 🔥 À MODIFIER EN PRIORITÉ:
- **Chronopost** → **Chronopost Relay 48h**

### ✅ Optionnels (si tu veux être plus précis):
- **Mondial Relay** → **Mondial Relay - Point Relais** (si ce n'est pas déjà le cas)
- **Colissimo** → **Colissimo Domicile** ou **Colissimo Suivi**

---

## 🎯 Impact Immédiat:

Une fois modifié dans Medusa Admin, les nouveaux noms apparaîtront:
- ✅ Dans le checkout (sélection de livraison)
- ✅ Dans les notifications Slack
- ✅ Dans les emails de confirmation
- ✅ Dans Medusa Admin

**Aucun code à changer, tout est automatique ! 🚀**

---

## 🔍 Alternative: Script SQL (Plus Rapide)

Si tu as accès à la base de données PostgreSQL:

```sql
-- Voir les shipping options actuelles
SELECT id, name, provider_id FROM shipping_option;

-- Mettre à jour Chronopost
UPDATE shipping_option 
SET name = 'Chronopost Relay 48h' 
WHERE name LIKE '%Chronopost%';

-- Vérifier
SELECT id, name, provider_id FROM shipping_option;
```

---

## ⚡ Option Ultra-Rapide: Via API

Si tu préfères, je peux créer un script Node.js qui met à jour les noms automatiquement via l'API Medusa Admin.

**Dis-moi ce que tu préfères ! 🎯**
