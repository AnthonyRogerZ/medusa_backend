# 🚀 Guide de Configuration Railway - Correction Boucle de Connexion

## ⚠️ URGENT : Variables d'environnement à configurer sur Railway

Allez sur votre dashboard Railway et configurez ces variables d'environnement :

### 1. CORS Configuration
```
STORE_CORS=https://gomgom-bonbons.vercel.app,http://localhost:3000
ADMIN_CORS=https://medusabackend-production-e0e9.up.railway.app,http://localhost:5173,http://localhost:9000
AUTH_CORS=https://medusabackend-production-e0e9.up.railway.app,https://gomgom-bonbons.vercel.app,http://localhost:5173,http://localhost:9000
```

### 2. Secrets de sécurité (CRITIQUES)
```
JWT_SECRET=76396b530e1c6445381c6ede4e1a2716774723dd71544f34ab96c49ec66ffb15
COOKIE_SECRET=1b8361c128456eed0aabafb34e2a8d6683360999cdda58664ace79b7ef9b7e78
```

### 3. Base de données
Assurez-vous que `DATABASE_URL` est configurée avec votre base PostgreSQL Railway.

## 🔧 Étapes de déploiement

1. **Aller sur Railway Dashboard** : https://railway.app/dashboard
2. **Sélectionner votre projet** medusa-backend
3. **Aller dans Variables** (onglet Variables)
4. **Ajouter/Modifier** les variables ci-dessus
5. **Redéployer** le service

## 🐛 Problèmes résolus

- ✅ **Boucle de connexion** : ADMIN_CORS manquait l'URL Railway
- ✅ **Erreurs 408** : Timeout causé par mauvaise config CORS
- ✅ **Access-Control-Allow-Origin: \*** : Incompatible avec credentials
- ✅ **Secrets faibles** : JWT et COOKIE secrets générés aléatoirement

## 🧪 Test après déploiement

Une fois déployé, testez :
1. https://medusabackend-production-e0e9.up.railway.app/health (doit retourner 200)
2. https://medusabackend-production-e0e9.up.railway.app/app/login (ne doit plus boucler)

## 📞 Si ça ne marche toujours pas

Vérifiez les logs Railway pour voir s'il y a des erreurs de démarrage.
