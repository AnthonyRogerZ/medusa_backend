/**
 * Script pour remettre l'ancien nom (juste renommer, RIEN supprimer)
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function restoreOldName() {
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
    
    // 2. Trouver "Default Location"
    const defaultLocation = locations.find(l => l.name === 'Default Location');
    
    if (!defaultLocation) {
      console.log('\n❌ "Default Location" introuvable');
      return;
    }
    
    console.log(`\n✅ "Default Location" trouvée: ${defaultLocation.id}`);
    
    // 3. Renommer en "Entrepôt Principal" (l'ancien nom)
    console.log('\n📝 Renommage en "Entrepôt Principal"...');
    await axios.post(
      `${BACKEND_URL}/admin/stock-locations/${defaultLocation.id}`,
      {
        name: 'Entrepôt Principal'
      },
      { headers }
    );
    
    console.log('✅ Nom restauré en "Entrepôt Principal" !');
    console.log('\n✅ TERMINÉ ! Rien n\'a été supprimé, juste renommé.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

restoreOldName();
