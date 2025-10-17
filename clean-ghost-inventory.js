/**
 * Script pour nettoyer l'inventaire fantôme de l'ancienne location
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function cleanGhostInventory() {
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
    
    const goodLocation = locations.find(l => l.name === 'Entrepôt Principal');
    
    if (!goodLocation) {
      console.log('\n❌ "Entrepôt Principal" introuvable');
      return;
    }
    
    console.log(`\n✅ Bonne location: ${goodLocation.id}`);
    
    // 2. Lister tous les produits
    console.log('\n📦 Récupération des produits...');
    const productsRes = await axios.get(`${BACKEND_URL}/admin/products?limit=200`, { headers });
    const products = productsRes.data.products;
    
    console.log(`Produits trouvés: ${products.length}`);
    
    // 3. Pour chaque produit, nettoyer l'inventaire
    for (const product of products) {
      console.log(`\n📦 Produit: ${product.title}`);
      
      for (const variant of product.variants) {
        console.log(`  - Variant: ${variant.title || 'Default'}`);
        
        // Récupérer l'inventory item
        try {
          const invRes = await axios.get(
            `${BACKEND_URL}/admin/inventory-items?variant_id=${variant.id}`,
            { headers }
          );
          
          if (invRes.data.inventory_items && invRes.data.inventory_items.length > 0) {
            const inventoryItem = invRes.data.inventory_items[0];
            console.log(`    Inventory ID: ${inventoryItem.id}`);
            
            // Lister les location levels
            if (inventoryItem.location_levels) {
              console.log(`    Location levels: ${inventoryItem.location_levels.length}`);
              
              for (const level of inventoryItem.location_levels) {
                console.log(`      - Location: ${level.location_id}, Stock: ${level.stocked_quantity}`);
                
                // Si ce n'est pas la bonne location, supprimer
                if (level.location_id !== goodLocation.id) {
                  console.log(`      ⚠️ Location fantôme détectée, suppression...`);
                  try {
                    await axios.delete(
                      `${BACKEND_URL}/admin/inventory-items/${inventoryItem.id}/location-levels/${level.id}`,
                      { headers }
                    );
                    console.log(`      ✅ Supprimé !`);
                  } catch (delErr) {
                    console.log(`      ❌ Erreur: ${delErr.response?.data?.message || delErr.message}`);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.log(`    ⚠️ Erreur: ${err.response?.data?.message || err.message}`);
        }
      }
    }
    
    console.log('\n✅ Nettoyage terminé ! Recharge l\'admin.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

cleanGhostInventory();
