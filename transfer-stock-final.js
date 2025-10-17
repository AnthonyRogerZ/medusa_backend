/**
 * Script pour transférer le stock de la location fantôme vers la bonne location
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

// IDs identifiés
const GOOD_LOCATION_ID = 'sloc_01K7S4C2V8PCGG4CB6EHF6R7S8'; // Entrepôt Principal
const GHOST_LOCATION_ID = 'sloc_01K4R1SWAWYXHHV0HT8Q3QGQSS'; // Location fantôme

async function transferStock() {
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
    
    let transferCount = 0;
    let deleteCount = 0;
    
    for (const item of inventoryItems) {
      const ghostLevel = item.location_levels?.find(l => l.location_id === GHOST_LOCATION_ID);
      const goodLevel = item.location_levels?.find(l => l.location_id === GOOD_LOCATION_ID);
      
      if (ghostLevel && ghostLevel.stocked_quantity > 0) {
        console.log(`📦 ${item.title || item.sku}`);
        console.log(`   👻 Stock fantôme: ${ghostLevel.stocked_quantity}`);
        console.log(`   ✅ Stock actuel: ${goodLevel?.stocked_quantity || 0}`);
        
        // Créer ou mettre à jour le stock dans la bonne location
        try {
          if (goodLevel) {
            // Mettre à jour
            await axios.post(
              `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels/${GOOD_LOCATION_ID}`,
              {
                stocked_quantity: ghostLevel.stocked_quantity
              },
              { headers }
            );
          } else {
            // Créer
            await axios.post(
              `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels`,
              {
                location_id: GOOD_LOCATION_ID,
                stocked_quantity: ghostLevel.stocked_quantity
              },
              { headers }
            );
          }
          console.log(`   ✅ Stock transféré: ${ghostLevel.stocked_quantity}`);
          transferCount++;
          
          // Supprimer le level fantôme
          try {
            await axios.delete(
              `${BACKEND_URL}/admin/inventory-items/${item.id}/location-levels/${ghostLevel.id}`,
              { headers }
            );
            console.log(`   🗑️ Level fantôme supprimé`);
            deleteCount++;
          } catch (delErr) {
            console.log(`   ⚠️ Erreur suppression: ${delErr.response?.data?.message || delErr.message}`);
          }
          
        } catch (err) {
          console.log(`   ❌ Erreur transfert: ${err.response?.data?.message || err.message}`);
        }
        
        console.log('');
      }
    }
    
    console.log(`\n✅ Terminé !`);
    console.log(`   📤 ${transferCount} stocks transférés`);
    console.log(`   🗑️ ${deleteCount} levels fantômes supprimés`);
    console.log(`\nRecharge ton admin et ton site !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

transferStock();
