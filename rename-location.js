/**
 * Script pour RENOMMER l'ancienne location (sans supprimer le stock)
 * Usage: node rename-location.js
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123'; // REMPLACE PAR TON MOT DE PASSE

async function renameLocation() {
  try {
    console.log('🔐 Connexion admin...');
    console.log(`URL: ${BACKEND_URL}/admin/auth`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    
    const loginRes = await axios.post(`${BACKEND_URL}/auth/user/emailpass`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Réponse:', JSON.stringify(loginRes.data, null, 2));
    
    const token = loginRes.data.user?.token || loginRes.data.token;
    console.log('✅ Connecté !');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 1. Lister les locations
    console.log('\n📦 Récupération des stock locations...');
    const locationsRes = await axios.get(`${BACKEND_URL}/admin/stock-locations`, { headers });
    const locations = locationsRes.data.stock_locations;
    
    console.log(`\nLocations trouvées (${locations.length}) :`);
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: "${loc.name || '(sans nom)'}"`);
    });
    
    // 2. Trouver l'ancienne location (celle sans nom ou avec "-")
    const oldLocation = locations.find(l => !l.name || l.name === '-' || l.name.trim() === '');
    
    if (!oldLocation) {
      console.log('\n❌ Ancienne location introuvable');
      console.log('Locations disponibles:');
      locations.forEach(loc => {
        console.log(`  - "${loc.name}" (ID: ${loc.id})`);
      });
      return;
    }
    
    console.log(`\n✅ Ancienne location trouvée: ${oldLocation.id}`);
    
    // 3. Renommer l'ancienne location
    console.log('\n📝 Renommage en "Entrepôt Principal"...');
    await axios.post(
      `${BACKEND_URL}/admin/stock-locations/${oldLocation.id}`,
      {
        name: 'Entrepôt Principal',
        address: {
          address_1: 'Lieusaint',
          city: '',
          country_code: 'fr',
          postal_code: ''
        }
      },
      { headers }
    );
    
    console.log('✅ Location renommée avec succès !');
    
    // 4. Supprimer les autres locations vides (si elles existent)
    console.log('\n🗑️ Nettoyage des locations vides...');
    for (const loc of locations) {
      if (loc.id !== oldLocation.id) {
        try {
          await axios.delete(`${BACKEND_URL}/admin/stock-locations/${loc.id}`, { headers });
          console.log(`  ✅ Supprimé: ${loc.name || loc.id}`);
        } catch (err) {
          console.log(`  ⚠️ Impossible de supprimer ${loc.name || loc.id}: ${err.response?.data?.message || err.message}`);
        }
      }
    }
    
    console.log('\n✅ Terminé ! Ton stock est intact et la location est renommée.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

renameLocation();
