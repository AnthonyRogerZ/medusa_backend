/**
 * Script pour transférer le stock de "-" vers "Entrepôt Principal"
 * PUIS supprimer le lien avec "-"
 */

const axios = require('axios');

const BACKEND_URL = 'https://medusabackend-production-e0e9.up.railway.app';
const ADMIN_EMAIL = 'admin@gomgombonbons.com';
const ADMIN_PASSWORD = 'UnGrosMot2Passe!123';

async function transferInventory() {
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
    
    const oldLocation = locations.find(l => !l.name || l.name === '-' || l.name.trim() === '');
    const newLocation = locations.find(l => l.name === 'Entrepôt Principal');
    
    if (!oldLocation) {
      console.log('\n⚠️ Ancienne location "-" introuvable. Peut-être déjà nettoyée ?');
      return;
    }
    
    if (!newLocation) {
      console.log('\n❌ "Entrepôt Principal" introuvable');
      return;
    }
    
    console.log(`\n✅ Ancienne location: ${oldLocation.id}`);
    console.log(`✅ Nouvelle location: ${newLocation.id}`);
    
    // 2. Lister tous les produits
    console.log('\n📦 Récupération des produits...');
    const productsRes = await axios.get(`${BACKEND_URL}/admin/products?limit=200`, { headers });
    const products = productsRes.data.products;
    
    console.log(`Produits trouvés: ${products.length}`);
    
    // 3. Pour chaque produit, transférer le stock
    for (const product of products) {
      console.log(`\n📦 Produit: ${product.title}`);
      
      for (const variant of product.variants) {
        console.log(`  - Variant: ${variant.title || 'Default'}`);
        
        try {
          const invRes = await axios.get(
            `${BACKEND_URL}/admin/inventory-items?variant_id=${variant.id}`,
            { headers }
          );
          
          if (invRes.data.inventory_items && invRes.data.inventory_items.length > 0) {
            const inventoryItem = invRes.data.inventory_items[0];
            console.log(`    Inventory ID: ${inventoryItem.id}`);
            
            if (inventoryItem.location_levels) {
              let oldLocationStock = 0;
              let newLocationStock = 0;
              let oldLocationLevelId = null;
              
              // Trouver les quantités
              for (const level of inventoryItem.location_levels) {
                if (level.location_id === oldLocation.id) {
                  oldLocationStock = level.stocked_quantity;
                  oldLocationLevelId = level.id;
                  console.log(`    📊 Stock dans "-": ${oldLocationStock}`);
                }
                if (level.location_id === newLocation.id) {
                  newLocationStock = level.stocked_quantity;
                  console.log(`    📊 Stock dans "Entrepôt Principal": ${newLocationStock}`);
                }
              }
              
              // Si l'ancienne location a du stock
              if (oldLocationStock > 0) {
                // Créer ou mettre à jour le stock dans la nouvelle location
                console.log(`    📤 Transfert de ${oldLocationStock} unités vers "Entrepôt Principal"...`);
                
                try {
                  if (newLocationStock === 0) {
                    // Créer le stock dans la nouvelle location
                    await axios.post(
                      `${BACKEND_URL}/admin/inventory-items/${inventoryItem.id}/location-levels`,
                      {
                        location_id: newLocation.id,
                        stocked_quantity: oldLocationStock
                      },
                      { headers }
                    );
                    console.log(`    ✅ Stock créé dans "Entrepôt Principal": ${oldLocationStock}`);
                  } else {
                    // Mettre à jour (si déjà existant, on garde le max)
                    const finalStock = Math.max(oldLocationStock, newLocationStock);
                    await axios.post(
                      `${BACKEND_URL}/admin/inventory-items/${inventoryItem.id}/location-levels/${newLocation.id}`,
                      {
                        stocked_quantity: finalStock
                      },
                      { headers }
                    );
                    console.log(`    ✅ Stock mis à jour dans "Entrepôt Principal": ${finalStock}`);
                  }
                  
                  // Supprimer le lien avec l'ancienne location
                  if (oldLocationLevelId) {
                    console.log(`    🗑️ Suppression du lien avec "-"...`);
                    await axios.delete(
                      `${BACKEND_URL}/admin/inventory-items/${inventoryItem.id}/location-levels/${oldLocationLevelId}`,
                      { headers }
                    );
                    console.log(`    ✅ Lien supprimé !`);
                  }
                  
                } catch (transferErr) {
                  console.log(`    ❌ Erreur transfert: ${transferErr.response?.data?.message || transferErr.message}`);
                }
              }
            }
          }
        } catch (err) {
          console.log(`    ⚠️ Erreur: ${err.response?.data?.message || err.message}`);
        }
      }
    }
    
    console.log('\n✅ Transfert terminé ! Recharge l\'admin.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

transferInventory();
