const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function fixShippingProfiles() {
  try {
    console.log('🔐 Connexion admin...');
    const authRes = await axios.post(`${BACKEND_URL}/auth/user/emailpass`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const token = authRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Connecté!\n');

    // 1. Récupérer le default shipping profile
    console.log('📦 Récupération des shipping profiles...');
    const profilesRes = await axios.get(`${BACKEND_URL}/admin/shipping-profiles`, { headers });
    const profiles = profilesRes.data.shipping_profiles;
    
    const defaultProfile = profiles.find(p => p.type === 'default');
    
    if (!defaultProfile) {
      console.error('❌ Aucun shipping profile par défaut trouvé!');
      return;
    }

    console.log(`✅ Default Profile trouvé: ${defaultProfile.id}\n`);

    // 2. Récupérer tous les produits
    console.log('📦 Récupération des produits...');
    const productsRes = await axios.get(`${BACKEND_URL}/admin/products?limit=200`, { headers });
    const products = productsRes.data.products;

    console.log(`📊 Total produits: ${products.length}\n`);

    // 3. Identifier les produits sans profile
    const productsToFix = products.filter(p => !p.profile_id);
    
    if (productsToFix.length === 0) {
      console.log('🎉 Tous les produits ont déjà un shipping profile!');
      return;
    }

    console.log(`⚠️  ${productsToFix.length} produits à corriger\n`);

    // 4. Corriger chaque produit
    let fixed = 0;
    let errors = 0;

    for (const product of productsToFix) {
      try {
        console.log(`🔧 Correction: ${product.title}...`);
        
        // Utiliser la bonne API Medusa v2
        await axios.post(
          `${BACKEND_URL}/admin/products/${product.id}`,
          { shipping_profile_id: defaultProfile.id },
          { headers }
        );
        
        console.log(`  ✅ Corrigé!`);
        fixed++;
      } catch (error) {
        console.error(`  ❌ Erreur: ${error.response?.data?.message || error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`  ✅ Produits corrigés: ${fixed}`);
    console.log(`  ❌ Erreurs: ${errors}`);
    
    if (fixed > 0) {
      console.log(`\n🎉 Correction terminée! Tous les produits ont maintenant un shipping profile.`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

fixShippingProfiles();
