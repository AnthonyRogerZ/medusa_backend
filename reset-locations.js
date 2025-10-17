/**
 * Script pour supprimer les locations cassées et en créer une nouvelle
 * Usage: node reset-locations.js
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'anthonyroger.pro@gmail.com';
const ADMIN_PASSWORD = 'ton_mot_de_passe'; // REMPLACE PAR TON MOT DE PASSE

async function resetLocations() {
  try {
    console.log('🔐 Connexion admin...');
    
    const loginRes = await axios.post(`${BACKEND_URL}/admin/auth`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginRes.data.user.token;
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
    
    // 2. Supprimer toutes les locations
    console.log('\n🗑️ Suppression des locations...');
    for (const loc of locations) {
      try {
        await axios.delete(`${BACKEND_URL}/admin/stock-locations/${loc.id}`, { headers });
        console.log(`  ✅ Supprimé: ${loc.name || loc.id}`);
      } catch (err) {
        console.log(`  ⚠️ Impossible de supprimer ${loc.id}: ${err.response?.data?.message || err.message}`);
      }
    }
    
    // 3. Créer une nouvelle location
    console.log('\n📦 Création de "Entrepôt Principal"...');
    const newLocationRes = await axios.post(
      `${BACKEND_URL}/admin/stock-locations`,
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
    
    const newLocation = newLocationRes.data.stock_location;
    console.log(`✅ Location créée: ${newLocation.id}`);
    
    // 4. Associer à la région France
    console.log('\n🌍 Association à la région France...');
    const regionsRes = await axios.get(`${BACKEND_URL}/admin/regions`, { headers });
    const franceRegion = regionsRes.data.regions.find(r => r.name.includes('France'));
    
    if (franceRegion) {
      await axios.post(
        `${BACKEND_URL}/admin/regions/${franceRegion.id}`,
        {
          fulfillment_providers: ['dynamic-shipping']
        },
        { headers }
      );
      console.log(`✅ Région France mise à jour`);
    }
    
    console.log('\n✅ Terminé ! Maintenant, va dans l\'admin et ajoute le stock manuellement pour chaque produit.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

resetLocations();
