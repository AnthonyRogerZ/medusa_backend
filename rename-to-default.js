/**
 * Script pour renommer en "Default Location"
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function renameToDefault() {
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
    console.log(`Location actuelle: ${location.name} (${location.id})`);
    
    // 2. Renommer en "Default Location"
    console.log('\n📝 Renommage en "Default Location"...');
    await axios.post(
      `${BACKEND_URL}/admin/stock-locations/${location.id}`,
      {
        name: 'Default Location'
      },
      { headers }
    );
    
    console.log('✅ Location renommée en "Default Location" !');
    console.log('\nMaintenant, recharge ton site et vérifie si tu peux ajouter au panier.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

renameToDefault();
