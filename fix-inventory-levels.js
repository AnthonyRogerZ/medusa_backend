/**
 * Script pour lister et nettoyer les inventory levels orphelins
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function fixInventoryLevels() {
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
    
    // 1. Récupérer la bonne location
    console.log('\n📦 Récupération de la location...');
    const locationsRes = await axios.get(`${BACKEND_URL}/admin/stock-locations`, { headers });
    const goodLocation = locationsRes.data.stock_locations[0];
    console.log(`Location valide: ${goodLocation.name} (${goodLocation.id})`);
    
    // 2. Récupérer UN SEUL produit pour tester (SKU 0003)
    console.log('\n📦 Récupération du produit SKU 0003 (TEST)...');
    const productsRes = await axios.get(`${BACKEND_URL}/admin/products?limit=200`, { headers });
    const allProducts = productsRes.data.products;
    
    // Trouver le produit avec SKU 0003
    let testProduct = null;
    for (const p of allProducts) {
      for (const v of p.variants) {
        if (v.sku === '0003') {
          testProduct = p;
          break;
        }
      }
      if (testProduct) break;
    }
    
    if (!testProduct) {
      console.log('❌ Produit avec SKU 0003 introuvable');
      console.log('Produits disponibles:');
      allProducts.slice(0, 5).forEach(p => {
        console.log(`  - ${p.title} (SKU: ${p.variants[0]?.sku || 'N/A'})`);
      });
      return;
    }
    
    console.log(`✅ Produit trouvé: ${testProduct.title}\n`);
    
    const products = [testProduct]; // On teste sur UN SEUL produit
    
    // 3. Analyser l'inventaire
    for (const product of products) {
      console.log(`📦 ${product.title}`);
      
      for (const variant of product.variants) {
        try {
          // Récupérer l'inventory item via le variant
          const invRes = await axios.get(
            `${BACKEND_URL}/admin/variants/${variant.id}/inventory`,
            { headers }
          );
          
          if (invRes.data.inventory_items && invRes.data.inventory_items.length > 0) {
            const inventoryItem = invRes.data.inventory_items[0];
            
            if (inventoryItem.location_levels && inventoryItem.location_levels.length > 0) {
              console.log(`  Variant: ${variant.title || 'Default'}`);
              console.log(`  Inventory ID: ${inventoryItem.id}`);
              console.log(`  Location levels (${inventoryItem.location_levels.length}):`);
              
              for (const level of inventoryItem.location_levels) {
                const isGood = level.location_id === goodLocation.id;
                const status = isGood ? '✅' : '❌ ORPHELIN';
                console.log(`    ${status} Location: ${level.location_id}, Stock: ${level.stocked_quantity}`);
                
                // Si c'est un orphelin, proposer de le supprimer
                if (!isGood) {
                  console.log(`    ⚠️ ORPHELIN DÉTECTÉ - À supprimer`);
                  console.log(`    💡 Commande pour supprimer:`);
                  console.log(`       DELETE /admin/inventory-items/${inventoryItem.id}/location-levels/${level.id}`);
                  
                  // DÉCOMMENTER CES LIGNES POUR SUPPRIMER AUTOMATIQUEMENT
                  /*
                  console.log(`    🗑️ Suppression de l'orphelin...`);
                  try {
                    await axios.delete(
                      `${BACKEND_URL}/admin/inventory-items/${inventoryItem.id}/location-levels/${level.id}`,
                      { headers }
                    );
                    console.log(`    ✅ Supprimé !`);
                  } catch (delErr) {
                    console.log(`    ❌ Erreur: ${delErr.response?.data?.message || delErr.message}`);
                  }
                  */
                }
              }
            }
          }
        } catch (err) {
          console.log(`  ⚠️ Erreur: ${err.response?.data?.message || err.message}`);
        }
      }
      console.log('');
    }
    
    console.log('✅ Nettoyage terminé ! Recharge l\'admin (Ctrl+F5).');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

fixInventoryLevels();
