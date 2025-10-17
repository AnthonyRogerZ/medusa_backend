/**
 * Script pour mettre le stock fantôme à 0, puis supprimer les levels
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

const GHOST_LOCATION_ID = 'sloc_01K4R1SWAWYXHHV0HT8Q3QGQSS';

async function zeroThenDelete() {
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
    
    let zeroCount = 0;
    let deleteCount = 0;
    
    // ÉTAPE 1 : Mettre tous les stocks fantômes à 0
    console.log('🔄 ÉTAPE 1 : Mise à 0 des stocks fantômes...\n');
    
    for (const item of inventoryItems) {
      const ghostLevel = item.location_levels?.find(l => l.location_id === GHOST_LOCATION_ID);
      
      if (ghostLevel && ghostLevel.stocked_quantity > 0) {
        console.log(`📦 ${item.title || item.sku} (stock: ${ghostLevel.stocked_quantity})`);
        
        try {
          await axios.post(
            `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels/${GHOST_LOCATION_ID}`,
            {
              stocked_quantity: 0
            },
            { headers }
          );
          console.log(`   ✅ Stock mis à 0`);
          zeroCount++;
        } catch (err) {
          console.log(`   ❌ Erreur: ${err.response?.data?.message || err.message}`);
        }
      }
    }
    
    console.log(`\n✅ ${zeroCount} stocks mis à 0\n`);
    
    // ÉTAPE 2 : Supprimer les levels à 0
    console.log('🗑️ ÉTAPE 2 : Suppression des levels à 0...\n');
    
    // Recharger les items pour avoir les données à jour
    const invRes2 = await axios.get(`${BACKEND_URL}/admin/inventory-items?limit=200`, { headers });
    const inventoryItems2 = invRes2.data.inventory_items;
    
    for (const item of inventoryItems2) {
      const ghostLevel = item.location_levels?.find(l => l.location_id === GHOST_LOCATION_ID);
      
      if (ghostLevel) {
        console.log(`📦 ${item.title || item.sku}`);
        
        try {
          await axios.delete(
            `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels/${ghostLevel.id}`,
            { headers }
          );
          console.log(`   ✅ Level supprimé`);
          deleteCount++;
        } catch (err) {
          console.log(`   ❌ Erreur: ${err.response?.data?.message || err.message}`);
        }
      }
    }
    
    console.log(`\n✅ TERMINÉ !`);
    console.log(`   🔄 ${zeroCount} stocks mis à 0`);
    console.log(`   🗑️ ${deleteCount} levels supprimés`);
    console.log(`\nRecharge ton admin (Ctrl+F5) !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

zeroThenDelete();
