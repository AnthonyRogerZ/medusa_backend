const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function checkShippingProfiles() {
  try {
    console.log('🔐 Connexion admin...');
    const authRes = await axios.post(`${BACKEND_URL}/auth/user/emailpass`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const token = authRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ Connecté!\n');

    // 1. Récupérer les shipping profiles
    console.log('📦 Récupération des shipping profiles...');
    const profilesRes = await axios.get(`${BACKEND_URL}/admin/shipping-profiles`, { headers });
    const profiles = profilesRes.data.shipping_profiles;
    
    console.log(`\n📋 Shipping Profiles disponibles:`);
    profiles.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id}, Type: ${p.type})`);
    });

    const defaultProfile = profiles.find(p => p.type === 'default');
    console.log(`\n✅ Default Profile: ${defaultProfile?.id}\n`);

    // 2. Récupérer tous les produits
    console.log('📦 Récupération des produits...');
    const productsRes = await axios.get(`${BACKEND_URL}/admin/products?limit=200`, { headers });
    const products = productsRes.data.products;

    console.log(`\n📊 Total produits: ${products.length}\n`);

    // 3. Vérifier les shipping profiles
    let withProfile = 0;
    let withoutProfile = 0;
    const problematicProducts = [];

    products.forEach(product => {
      if (product.profile_id) {
        withProfile++;
        console.log(`✅ ${product.title} → Profile: ${product.profile_id}`);
      } else {
        withoutProfile++;
        console.log(`❌ ${product.title} → PAS DE PROFILE!`);
        problematicProducts.push(product);
      }
    });

    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`  ✅ Avec profile: ${withProfile}`);
    console.log(`  ❌ Sans profile: ${withoutProfile}`);

    if (withoutProfile > 0) {
      console.log(`\n⚠️  PROBLÈME DÉTECTÉ!`);
      console.log(`\n🛠️  Produits à corriger:`);
      problematicProducts.forEach(p => {
        console.log(`  - ${p.title} (ID: ${p.id})`);
      });
      console.log(`\n💡 Solution: Exécute fix-shipping-profiles.js pour corriger automatiquement`);
    } else {
      console.log(`\n🎉 Tous les produits ont un shipping profile!`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

checkShippingProfiles();
