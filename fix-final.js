/**
 * Script final : garder l'ancienne location et supprimer les doublons
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function fixFinal() {
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
    
    // 1. Lister les locations
    console.log('\n📦 Récupération des locations...');
    const locationsRes = await axios.get(`${BACKEND_URL}/admin/stock-locations`, { headers });
    const locations = locationsRes.data.stock_locations;
    
    console.log(`\nLocations trouvées (${locations.length}) :`);
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: "${loc.name || '(sans nom)'}"`);
    });
    
    // 2. Trouver l'ancienne location (celle avec "-" ou sans nom)
    const oldLocation = locations.find(l => !l.name || l.name === '-' || l.name.trim() === '');
    const defaultLocation = locations.find(l => l.name === 'Default Location');
    
    if (!oldLocation) {
      console.log('\n⚠️ Ancienne location introuvable. On garde "Default Location".');
      return;
    }
    
    console.log(`\n✅ Ancienne location trouvée: ${oldLocation.id}`);
    
    // 3. Renommer l'ancienne location
    console.log('\n📝 Renommage de l\'ancienne location en "Default Location"...');
    await axios.post(
      `${BACKEND_URL}/admin/stock-locations/${oldLocation.id}`,
      {
        name: 'Default Location',
        address: oldLocation.address || {
          address_1: 'Lieusaint',
          city: '',
          country_code: 'fr',
          postal_code: ''
        }
      },
      { headers }
    );
    
    console.log('✅ Ancienne location renommée !');
    
    // 4. Supprimer les autres locations (si possible)
    if (defaultLocation && defaultLocation.id !== oldLocation.id) {
      console.log(`\n🗑️ Tentative de suppression de la location en double (${defaultLocation.id})...`);
      try {
        await axios.delete(`${BACKEND_URL}/admin/stock-locations/${defaultLocation.id}`, { headers });
        console.log('✅ Location en double supprimée !');
      } catch (err) {
        console.log('⚠️ Impossible de supprimer (contient peut-être du stock):', err.response?.data?.message || err.message);
        console.log('\n💡 Solution : Va dans l\'admin et transfère manuellement le stock de "Default Location" vers l\'autre location, puis supprime-la.');
      }
    }
    
    console.log('\n✅ Terminé ! Recharge ton site et teste.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

fixFinal();
