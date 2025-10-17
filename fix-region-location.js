/**
 * Script pour associer la location à la région France
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function fixRegionLocation() {
  try {
    console.log('🔐 Connexion admin...');
    
    const loginRes = await axios.post(`${BACKEND_URL}/auth/user/emailpass`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connecté !');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 1. Récupérer la location
    console.log('\n📦 Récupération de la location...');
    const locationsRes = await axios.get(`${BACKEND_URL}/admin/stock-locations`, { headers });
    const location = locationsRes.data.stock_locations[0];
    console.log(`Location: ${location.name} (${location.id})`);
    
    // 2. Récupérer les régions
    console.log('\n🌍 Récupération des régions...');
    const regionsRes = await axios.get(`${BACKEND_URL}/admin/regions`, { headers });
    const regions = regionsRes.data.regions;
    
    console.log(`Régions trouvées (${regions.length}) :`);
    regions.forEach(r => {
      console.log(`  - ${r.name} (${r.id})`);
    });
    
    // 3. Trouver la région France
    const franceRegion = regions.find(r => 
      r.name.toLowerCase().includes('france') || 
      r.countries?.some(c => c.iso_2 === 'fr')
    );
    
    if (!franceRegion) {
      console.log('\n❌ Région France introuvable');
      return;
    }
    
    console.log(`\n✅ Région France trouvée: ${franceRegion.name} (${franceRegion.id})`);
    
    // 4. Vérifier les fulfillment sets
    console.log('\n📦 Vérification des fulfillment sets...');
    const setsRes = await axios.get(`${BACKEND_URL}/admin/fulfillment-sets`, { headers });
    console.log('Fulfillment sets:', JSON.stringify(setsRes.data, null, 2));
    
    // 5. Créer un fulfillment set si nécessaire
    console.log('\n🔗 Création du lien région → location...');
    try {
      const setRes = await axios.post(
        `${BACKEND_URL}/admin/fulfillment-sets`,
        {
          name: 'France Fulfillment',
          type: 'shipping',
          service_zones: [{
            name: 'France',
            geo_zones: [{
              type: 'country',
              country_code: 'fr'
            }]
          }]
        },
        { headers }
      );
      console.log('✅ Fulfillment set créé:', setRes.data);
    } catch (err) {
      console.log('⚠️ Erreur:', err.response?.data?.message || err.message);
    }
    
    console.log('\n✅ Terminé ! Vérifie maintenant dans l\'admin.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

fixRegionLocation();
