/**
 * Script pour supprimer TOUS les inventory levels de la location fantôme
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

const GHOST_LOCATION_ID = 'sloc_01K4R1SWAWYXHHV0HT8Q3QGQSS';

async function deleteAllGhost() {
  try {
    console.log('🔐 Connexion admin...');
    
    const loginRes = await axios.post(`${BACKEND_URL}/auth/user/emailpass`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connecté !\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Récupérer tous les inventory items
    console.log('📦 Récupération des inventory items...');
    const invRes = await axios.get(`${BACKEND_URL}/admin/inventory-items?limit=200`, { headers });
    const inventoryItems = invRes.data.inventory_items;
    
    console.log(`Items trouvés: ${inventoryItems.length}\n`);
    console.log('🗑️ Suppression des levels fantômes...\n');
    
    let deleteCount = 0;
    let notFoundCount = 0;
    
    for (const item of inventoryItems) {
      const ghostLevel = item.location_levels?.find(l => l.location_id === GHOST_LOCATION_ID);
      
      if (ghostLevel) {
        console.log(`📦 ${item.title || item.sku} (stock: ${ghostLevel.stocked_quantity})`);
        
        try {
          // Essayer de supprimer via l'API standard
          await axios.delete(
            `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels/${ghostLevel.id}`,
            { headers }
          );
          console.log(`   ✅ Supprimé !`);
          deleteCount++;
        } catch (err) {
          if (err.response?.status === 404 || err.response?.data?.message?.includes('not found')) {
            console.log(`   ℹ️ Déjà supprimé`);
            notFoundCount++;
          } else {
            console.log(`   ❌ Erreur: ${err.response?.data?.message || err.message}`);
          }
        }
      }
    }
    
    console.log(`\n✅ TERMINÉ !`);
    console.log(`   🗑️ ${deleteCount} levels supprimés`);
    console.log(`   ℹ️ ${notFoundCount} déjà supprimés`);
    console.log(`\n🎉 Recharge ton admin (Ctrl+F5) et vérifie !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

deleteAllGhost();
