# 📢 Configuration des Notifications Slack

## 🎯 Ce que vous recevrez

À chaque nouvelle commande, vous recevrez une notification Slack super propre avec:

- ✅ **Numéro de commande** et **montant total**
- ✅ **Nom et email du client**
- ✅ **Liste des produits** commandés
- ✅ **Adresse de livraison complète** (avec téléphone)
- ✅ **Instructions spéciales** (order_notes) si le client en a laissé
- ✅ **Bouton "Voir la Commande"** (lien frontend)
- ✅ **Bouton "Imprimer Étiquette"** (lien direct Medusa Admin)

## 📋 Configuration en 3 Étapes

### Étape 1: Créer un Webhook Slack

1. **Aller sur:** https://api.slack.com/apps
2. **Cliquer sur** "Create New App"
3. **Choisir** "From scratch"
4. **Nommer l'app:** "GomGom Bonbons Notifications" (ou autre nom)
5. **Sélectionner le workspace** Slack de votre entreprise

### Étape 2: Activer les Incoming Webhooks

1. Dans la sidebar gauche, cliquer sur **"Incoming Webhooks"**
2. Activer le toggle **"Activate Incoming Webhooks"**
3. Cliquer sur **"Add New Webhook to Workspace"**
4. **Sélectionner le canal** où vous voulez recevoir les notifications
   - Par exemple: `#commandes` ou `#orders` ou `#ventes`
5. Cliquer sur **"Allow"**

### Étape 3: Copier le Webhook URL

1. Vous verrez une URL qui ressemble à:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
2. **Copier cette URL complète**

### Étape 4: Ajouter à Railway

1. Aller sur **Railway Dashboard**: https://railway.app
2. Sélectionner votre projet **medusabackend-production**
3. Aller dans **Variables**
4. Cliquer sur **"New Variable"**
5. Ajouter:
   - **Name:** `SLACK_WEBHOOK_URL`
   - **Value:** L'URL copiée de Slack
6. Cliquer sur **"Add"**

### Étape 5: Redéployer

Railway redéploiera automatiquement après l'ajout de la variable.

**OU** forcer un redéploiement:
1. Aller dans **Deployments**
2. Cliquer sur les 3 points `...` du dernier déploiement
3. Cliquer sur **"Redeploy"**

## ✅ Tester

1. **Créer une commande test** sur votre site
2. **Vérifier Slack** dans le canal sélectionné
3. Vous devriez voir une belle notification avec toutes les infos !

## 🎨 Exemple de Notification

```
🎉 Nouvelle Commande #26

Total:                    Client:
7,98 €                    Anthony Roger

────────────────────────────────────

📦 Produits:
• Etoiles twist framboise lisses - 100 gr x1 - 1,99 €

────────────────────────────────────

📍 Adresse de Livraison:
Anthony Roger
10 RUE DU PRESBYTERE
77930 Chailly-en-Bière Île-de-France
FR
📞 +33787207061

────────────────────────────────────

📝 Instructions Spéciales:
"Merci de séparer les bonbons lisses des sour"

────────────────────────────────────

[👁️ Voir la Commande]  [🖨️ Imprimer Étiquette]

📧 Pro.anthony23@gmail.com | 🆔 order_01K82WJMS8QTYHCNT5G42X24X4
```

## 🔧 Désactiver les Notifications (si besoin)

Pour désactiver temporairement:
1. Railway → Variables
2. Supprimer ou commenter `SLACK_WEBHOOK_URL`

Le système continuera de fonctionner normalement, mais sans envoyer les notifications Slack.

## 📝 Personnalisation

Pour modifier le message (couleurs, emojis, contenu):
- Éditer le fichier: `/src/lib/slack/notifications.ts`
- Fonction: `buildSlackMessage()`

## 🆘 Dépannage

**Pas de notification reçue?**
1. Vérifier que `SLACK_WEBHOOK_URL` est bien défini dans Railway
2. Vérifier les logs Railway pour voir les erreurs
3. Tester l'URL Webhook avec curl:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
   --data '{"text":"Test notification"}' \
   YOUR_WEBHOOK_URL
   ```

**Notification mal formatée?**
- Vérifier que tous les champs sont bien remplis dans la commande
- Regarder les logs Railway pour voir ce qui est envoyé

## 🎉 C'est Tout !

Votre système de notifications Slack est prêt ! 
Chaque commande générera automatiquement une belle notification avec toutes les infos importantes.
