/**
 * Script pour vérifier s'il reste des ghost levels
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

const GHOST_LOCATION_ID = 'sloc_01K4R1SWAWYXHHV0HT8Q3QGQSS';
const GOOD_LOCATION_ID = 'sloc_01K7S4C2V8PCGG4CB6EHF6R7S8';

async function checkGhostLevels() {
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
    const invRes = await axios.get(`${BACKEND_URL}/admin/inventory-items?limit=200`, { headers });
    const inventoryItems = invRes.data.inventory_items;
    
    console.log(`📊 STATISTIQUES\n`);
    
    let ghostCount = 0;
    let goodCount = 0;
    let bothCount = 0;
    
    for (const item of inventoryItems) {
      const hasGhost = item.location_levels?.some(l => l.location_id === GHOST_LOCATION_ID);
      const hasGood = item.location_levels?.some(l => l.location_id === GOOD_LOCATION_ID);
      
      if (hasGhost && hasGood) {
        bothCount++;
      } else if (hasGhost) {
        ghostCount++;
        console.log(`⚠️ ${item.title || item.sku} - SEULEMENT dans location fantôme`);
      } else if (hasGood) {
        goodCount++;
      }
    }
    
    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ Items dans la bonne location uniquement: ${goodCount}`);
    console.log(`   ⚠️ Items dans les 2 locations: ${bothCount}`);
    console.log(`   ❌ Items dans la location fantôme uniquement: ${ghostCount}`);
    console.log(`   📦 Total: ${inventoryItems.length}`);
    
    if (bothCount === 0 && ghostCount === 0) {
      console.log(`\n🎉 PARFAIT ! Plus aucun ghost level !`);
    } else {
      console.log(`\n⚠️ Il reste ${bothCount + ghostCount} items à nettoyer`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

checkGhostLevels();
