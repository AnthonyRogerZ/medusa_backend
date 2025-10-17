/**
 * Script pour réparer l'inventaire
 * Usage: node fix-inventory.js
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'anthonyroger.pro@gmail.com'; // Ton email admin
const ADMIN_PASSWORD = 'ton_mot_de_passe'; // À remplacer

async function fixInventory() {
  try {
    console.log('🔐 Connexion admin...');
    
    // 1. Se connecter en tant qu'admin
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
    
    // 2. Lister les stock locations
    console.log('\n📦 Récupération des stock locations...');
    const locationsRes = await axios.get(`${BACKEND_URL}/admin/stock-locations`, { headers });
    const locations = locationsRes.data.stock_locations;
    
    console.log(`\nLocations trouvées (${locations.length}) :`);
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: "${loc.name || '(sans nom)'}"`);
    });
    
    // 3. Trouver "Entrepôt Principal"
    const entrepot = locations.find(l => l.name === 'Entrepôt Principal');
    const oldLocation = locations.find(l => !l.name || l.name === '-');
    
    if (!entrepot) {
      console.log('\n❌ "Entrepôt Principal" introuvable');
      return;
    }
    
    console.log(`\n✅ Entrepôt Principal trouvé: ${entrepot.id}`);
    
    // 4. Lister tous les produits
    console.log('\n📦 Récupération des produits...');
    const productsRes = await axios.get(`${BACKEND_URL}/admin/products?limit=100`, { headers });
    const products = productsRes.data.products;
    
    console.log(`\nProduits trouvés: ${products.length}`);
    
    // 5. Pour chaque produit, mettre à jour l'inventaire
    for (const product of products) {
      console.log(`\n📦 Produit: ${product.title}`);
      
      for (const variant of product.variants) {
        console.log(`  - Variant: ${variant.title || 'Default'}`);
        
        // Récupérer l'inventory item
        const invRes = await axios.get(
          `${BACKEND_URL}/admin/inventory-items?variant_id=${variant.id}`,
          { headers }
        );
        
        if (invRes.data.inventory_items.length > 0) {
          const inventoryItem = invRes.data.inventory_items[0];
          console.log(`    Inventory ID: ${inventoryItem.id}`);
          
          // Mettre à jour le stock pour "Entrepôt Principal"
          try {
            await axios.post(
              `${BACKEND_URL}/admin/inventory-items/${inventoryItem.id}/location-levels`,
              {
                location_id: entrepot.id,
                stocked_quantity: 100 // Quantité par défaut
              },
              { headers }
            );
            console.log(`    ✅ Stock ajouté: 100 unités`);
          } catch (err) {
            console.log(`    ⚠️ Erreur: ${err.response?.data?.message || err.message}`);
          }
        }
      }
    }
    
    console.log('\n✅ Terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

fixInventory();
