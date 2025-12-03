/**
 * Script de nettoyage des commandes de test
 * 
 * Ce script supprime TOUTES les commandes et données associées tout en:
 * - Conservant les produits, catégories, collections
 * - Conservant les clients (customers)
 * - Conservant les configurations (shipping, payment, etc.)
 * - Restaure le stock en supprimant les réservations
 * 
 * Usage: npx medusa exec src/scripts/cleanup-test-orders.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function cleanupTestOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  // Résoudre les modules nécessaires
  const orderModuleService = container.resolve(Modules.ORDER)
  const inventoryModuleService = container.resolve(Modules.INVENTORY)
  const cartModuleService = container.resolve(Modules.CART)
  const paymentModuleService = container.resolve(Modules.PAYMENT)
  
  logger.info("=".repeat(60))
  logger.info("🧹 NETTOYAGE DES COMMANDES DE TEST")
  logger.info("=".repeat(60))
  logger.info("")
  logger.info("⚠️  Ce script va supprimer:")
  logger.info("   - Toutes les commandes (orders)")
  logger.info("   - Toutes les réservations d'inventaire (reservations)")
  logger.info("   - Tous les paniers (carts)")
  logger.info("   - Toutes les sessions de paiement")
  logger.info("")
  logger.info("✅ Ce script va CONSERVER:")
  logger.info("   - Tous les produits et variantes")
  logger.info("   - Tout le stock (sera restauré)")
  logger.info("   - Tous les clients")
  logger.info("   - Toutes les configurations")
  logger.info("")
  logger.info("=".repeat(60))

  // 1. Supprimer les réservations d'inventaire (restaure le stock)
  logger.info("")
  logger.info("📦 Étape 1/4: Suppression des réservations d'inventaire...")
  try {
    const { data: reservations } = await query.graph({
      entity: "reservation",
      fields: ["id", "inventory_item_id", "quantity"],
    })
    
    if (reservations && reservations.length > 0) {
      logger.info(`   Trouvé ${reservations.length} réservation(s) à supprimer`)
      
      for (const reservation of reservations) {
        try {
          await inventoryModuleService.deleteReservationItems([reservation.id])
          logger.info(`   ✓ Réservation ${reservation.id} supprimée (${reservation.quantity} unités restaurées)`)
        } catch (e: any) {
          logger.warn(`   ⚠ Erreur suppression réservation ${reservation.id}: ${e.message}`)
        }
      }
      logger.info(`   ✅ ${reservations.length} réservation(s) supprimée(s) - Stock restauré!`)
    } else {
      logger.info("   Aucune réservation trouvée")
    }
  } catch (e: any) {
    logger.warn(`   ⚠ Erreur lors de la récupération des réservations: ${e.message}`)
  }

  // 2. Supprimer les commandes
  logger.info("")
  logger.info("🛒 Étape 2/4: Suppression des commandes...")
  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "status", "created_at"],
    })
    
    if (orders && orders.length > 0) {
      logger.info(`   Trouvé ${orders.length} commande(s) à supprimer`)
      
      for (const order of orders) {
        try {
          // Supprimer via le module order
          await orderModuleService.deleteOrders([order.id])
          logger.info(`   ✓ Commande #${order.display_id} (${order.email}) supprimée`)
        } catch (e: any) {
          logger.warn(`   ⚠ Erreur suppression commande #${order.display_id}: ${e.message}`)
        }
      }
      logger.info(`   ✅ ${orders.length} commande(s) supprimée(s)`)
    } else {
      logger.info("   Aucune commande trouvée")
    }
  } catch (e: any) {
    logger.error(`   ❌ Erreur lors de la récupération des commandes: ${e.message}`)
  }

  // 3. Supprimer les paniers
  logger.info("")
  logger.info("🛒 Étape 3/4: Suppression des paniers...")
  try {
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "email", "created_at"],
    })
    
    if (carts && carts.length > 0) {
      logger.info(`   Trouvé ${carts.length} panier(s) à supprimer`)
      
      for (const cart of carts) {
        try {
          await cartModuleService.deleteCarts([cart.id])
          logger.info(`   ✓ Panier ${cart.id.substring(0, 8)}... supprimé`)
        } catch (e: any) {
          logger.warn(`   ⚠ Erreur suppression panier: ${e.message}`)
        }
      }
      logger.info(`   ✅ ${carts.length} panier(s) supprimé(s)`)
    } else {
      logger.info("   Aucun panier trouvé")
    }
  } catch (e: any) {
    logger.warn(`   ⚠ Erreur lors de la récupération des paniers: ${e.message}`)
  }

  // 4. Supprimer les collections de paiement
  logger.info("")
  logger.info("💳 Étape 4/4: Suppression des sessions de paiement...")
  try {
    const { data: paymentCollections } = await query.graph({
      entity: "payment_collection",
      fields: ["id"],
    })
    
    if (paymentCollections && paymentCollections.length > 0) {
      logger.info(`   Trouvé ${paymentCollections.length} collection(s) de paiement à supprimer`)
      
      for (const pc of paymentCollections) {
        try {
          await paymentModuleService.deletePaymentCollections([pc.id])
          logger.info(`   ✓ Collection de paiement supprimée`)
        } catch (e: any) {
          logger.warn(`   ⚠ Erreur suppression collection: ${e.message}`)
        }
      }
      logger.info(`   ✅ ${paymentCollections.length} collection(s) supprimée(s)`)
    } else {
      logger.info("   Aucune collection de paiement trouvée")
    }
  } catch (e: any) {
    logger.warn(`   ⚠ Erreur lors de la récupération des paiements: ${e.message}`)
  }

  // Résumé final
  logger.info("")
  logger.info("=".repeat(60))
  logger.info("✅ NETTOYAGE TERMINÉ!")
  logger.info("=".repeat(60))
  logger.info("")
  logger.info("📊 Vérification du stock...")
  
  try {
    const { data: inventoryLevels } = await query.graph({
      entity: "inventory_level",
      fields: ["id", "stocked_quantity", "reserved_quantity", "available_quantity", "inventory_item_id"],
    })
    
    if (inventoryLevels && inventoryLevels.length > 0) {
      let totalStock = 0
      let totalReserved = 0
      let totalAvailable = 0
      
      for (const level of inventoryLevels) {
        totalStock += level.stocked_quantity || 0
        totalReserved += level.reserved_quantity || 0
        totalAvailable += level.available_quantity || 0
      }
      
      logger.info(`   📦 Stock total: ${totalStock}`)
      logger.info(`   🔒 Réservé: ${totalReserved}`)
      logger.info(`   ✅ Disponible: ${totalAvailable}`)
    }
  } catch (e: any) {
    logger.warn(`   ⚠ Impossible de vérifier le stock: ${e.message}`)
  }
  
  logger.info("")
  logger.info("🎉 Votre boutique est prête pour la production!")
  logger.info("   N'oubliez pas de mettre Stripe en mode LIVE.")
  logger.info("")
}
