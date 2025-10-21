# 🔒 Sécurité de l'API Fulfillment

## Problème

La route `/fulfillment` permet de créer des expéditions et d'envoyer des emails aux clients. Sans authentification, **n'importe qui** pourrait :
- Créer de fausses expéditions
- Envoyer des emails frauduleux aux clients
- Manipuler les statuts de commandes

## Solution: Token d'Authentification

Un **token secret** partagé entre le backend (Railway) et le frontend (Vercel) protège l'API.

### Comment ça marche ?

1. **Backend** : Vérifie que le header `x-fulfillment-token` correspond à `FULFILLMENT_SECRET_TOKEN`
2. **Frontend** : Envoie `NEXT_PUBLIC_FULFILLMENT_TOKEN` dans le header
3. **Seules les requêtes avec le bon token** sont acceptées

---

## Configuration

### 1. Générer un Token Sécurisé

```bash
# Générer un token aléatoire de 64 caractères
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Exemple de sortie : `a3f8b2e9c1d4567890abcdef1234567890abcdef1234567890abcdef12345678`

### 2. Configurer Railway (Backend)

1. Va sur **Railway Dashboard**
2. Sélectionne ton projet backend
3. **Variables** → Ajoute :
   - **Name:** `FULFILLMENT_SECRET_TOKEN`
   - **Value:** Le token généré ci-dessus
4. Railway redémarre automatiquement

### 3. Configurer Vercel (Frontend)

1. Va sur **Vercel Dashboard**
2. Sélectionne ton projet frontend
3. **Settings** → **Environment Variables** → Ajoute :
   - **Name:** `NEXT_PUBLIC_FULFILLMENT_TOKEN`
   - **Value:** **LE MÊME TOKEN** que dans Railway
   - **Environments:** Production, Preview, Development
4. Redéploie le frontend

---

## Validation

### Test en Local

```bash
# Sans token (❌ Doit échouer)
curl -X POST https://medusabackend-production-e0e9.up.railway.app/fulfillment \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order_123", "trackingNumber": "TEST123"}'

# Réponse attendue: 401 Unauthorized

# Avec token (✅ Doit réussir)
curl -X POST https://medusabackend-production-e0e9.up.railway.app/fulfillment \
  -H "Content-Type: application/json" \
  -H "x-fulfillment-token: a3f8b2e9c1d4567890abcdef1234567890abcdef1234567890abcdef12345678" \
  -d '{"orderId": "order_01K833K4PQR10F0XZ3VAFFHD88", "trackingNumber": "TEST123"}'

# Réponse attendue: 200 OK avec détails de l'expédition
```

---

## Sécurité

### ✅ Bonnes Pratiques

- **Token long et aléatoire** (minimum 32 caractères)
- **Jamais commit le token** dans le code (utiliser `.env`)
- **Token différent pour chaque environnement** (dev/staging/prod)
- **Rotation régulière** du token (tous les 3-6 mois)

### ⚠️ Ce qui est Protégé

- ✅ Création de fulfillments
- ✅ Envoi d'emails aux clients
- ✅ Modification du statut des commandes

### 🔐 Niveau de Sécurité

**Moyen** : Protège contre les attaques basiques mais pas contre :
- Interception du token (nécessite HTTPS ✅ déjà en place)
- Fuite du token côté client (visible dans le code source du frontend)

**Pour une sécurité maximale**, il faudrait :
- Authentification OAuth2
- JWT tokens avec expiration
- Rate limiting
- IP whitelisting

Mais pour une boutique e-commerce standard, **ce niveau de sécurité est suffisant**.

---

## Maintenance

### Changer le Token

1. Générer un nouveau token
2. Mettre à jour sur Railway
3. Mettre à jour sur Vercel
4. Attendre le redéploiement (~2-3 min)
5. Tester

### Logs de Sécurité

Les tentatives d'accès non autorisées sont loggées dans Railway :

```
[inf] Unauthorized fulfillment attempt from IP: xxx.xxx.xxx.xxx
```

---

## Support

Si tu as des questions ou des problèmes :
1. Vérifie que les tokens sont identiques (Railway == Vercel)
2. Vérifie que Railway et Vercel ont bien redéployé
3. Teste avec `curl` pour isoler le problème
