/**
 * Script pour supprimer les inventory levels de la location fantôme
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

const GHOST_LOCATION_ID = 'sloc_01K4R1SWAWYXHHV0HT8Q3QGQSS'; // Location fantôme

async function deleteGhostLevels() {
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
    
    // Récupérer tous les inventory items
    console.log('\n📦 Récupération des inventory items...');
    const invRes = await axios.get(`${BACKEND_URL}/admin/inventory-items?limit=200`, { headers });
    const inventoryItems = invRes.data.inventory_items;
    
    console.log(`Inventory items trouvés: ${inventoryItems.length}\n`);
    
    let deleteCount = 0;
    
    for (const item of inventoryItems) {
      const ghostLevel = item.location_levels?.find(l => l.location_id === GHOST_LOCATION_ID);
      
      if (ghostLevel) {
        console.log(`📦 ${item.title || item.sku}`);
        console.log(`   👻 Ghost level ID: ${ghostLevel.id}`);
        
        try {
          // Supprimer le level fantôme
          await axios.delete(
            `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels/${ghostLevel.id}`,
            { headers }
          );
          console.log(`   ✅ Supprimé !`);
          deleteCount++;
        } catch (delErr) {
          console.log(`   ❌ Erreur: ${delErr.response?.data?.message || delErr.message}`);
        }
      }
    }
    
    console.log(`\n✅ Terminé !`);
    console.log(`   🗑️ ${deleteCount} levels fantômes supprimés`);
    console.log(`\nRecharge ton admin !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

deleteGhostLevels();
