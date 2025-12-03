-- ============================================================
-- SCRIPT DE NETTOYAGE DES COMMANDES DE TEST
-- ============================================================
-- Ce script supprime toutes les commandes et données associées
-- tout en CONSERVANT les produits et en RESTAURANT le stock
-- ============================================================

-- Afficher les stats avant nettoyage
SELECT '=== AVANT NETTOYAGE ===' as info;
SELECT 'Commandes:' as type, COUNT(*) as count FROM "order";
SELECT 'Réservations:' as type, COUNT(*) as count FROM reservation_item;
SELECT 'Paniers:' as type, COUNT(*) as count FROM cart;
SELECT 'Collections paiement:' as type, COUNT(*) as count FROM payment_collection;

-- ============================================================
-- ÉTAPE 1: Supprimer les réservations (RESTAURE LE STOCK)
-- ============================================================
-- Les réservations bloquent le stock, les supprimer le libère
DELETE FROM reservation_item;
SELECT 'Réservations supprimées - Stock restauré!' as status;

-- ============================================================
-- ÉTAPE 2: Supprimer les données liées aux commandes
-- ============================================================

-- Supprimer les fulfillments et leurs items
DELETE FROM order_shipping WHERE order_id IN (SELECT id FROM "order");
DELETE FROM fulfillment_item;
DELETE FROM fulfillment;

-- Supprimer les transactions de commande
DELETE FROM order_transaction;

-- Supprimer les changements de commande
DELETE FROM order_change_action;
DELETE FROM order_change;

-- Supprimer les claims et exchanges
DELETE FROM order_claim_item;
DELETE FROM order_claim_item_image;
DELETE FROM order_claim;
DELETE FROM order_exchange_item;
DELETE FROM order_exchange;

-- Supprimer les retours
DELETE FROM return_item;
DELETE FROM "return";

-- Supprimer les items de commande et leurs ajustements
DELETE FROM order_line_item_tax_line;
DELETE FROM order_line_item_adjustment;
DELETE FROM order_line_item;

-- Supprimer les shipping methods des commandes
DELETE FROM order_shipping_method_tax_line;
DELETE FROM order_shipping_method_adjustment;
DELETE FROM order_shipping_method;

-- Supprimer les adresses de commande
DELETE FROM order_address;

-- Supprimer les summary de commande
DELETE FROM order_summary;

-- ============================================================
-- ÉTAPE 3: Supprimer les commandes
-- ============================================================
DELETE FROM "order";
SELECT 'Commandes supprimées!' as status;

-- ============================================================
-- ÉTAPE 4: Supprimer les paniers
-- ============================================================
DELETE FROM cart_line_item_tax_line;
DELETE FROM cart_line_item_adjustment;
DELETE FROM cart_line_item;
DELETE FROM cart_shipping_method_tax_line;
DELETE FROM cart_shipping_method_adjustment;
DELETE FROM cart_shipping_method;
DELETE FROM cart_address;
DELETE FROM cart;
SELECT 'Paniers supprimés!' as status;

-- ============================================================
-- ÉTAPE 5: Supprimer les collections de paiement
-- ============================================================
DELETE FROM payment_session;
DELETE FROM payment;
DELETE FROM capture;
DELETE FROM refund;
DELETE FROM payment_collection;
SELECT 'Collections de paiement supprimées!' as status;

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================
SELECT '=== APRÈS NETTOYAGE ===' as info;
SELECT 'Commandes:' as type, COUNT(*) as count FROM "order";
SELECT 'Réservations:' as type, COUNT(*) as count FROM reservation_item;
SELECT 'Paniers:' as type, COUNT(*) as count FROM cart;
SELECT 'Collections paiement:' as type, COUNT(*) as count FROM payment_collection;

-- Vérifier le stock disponible
SELECT '=== STOCK DISPONIBLE ===' as info;
SELECT 
    COUNT(*) as "Nombre de produits avec stock",
    SUM(stocked_quantity) as "Stock total",
    SUM(reserved_quantity) as "Réservé (devrait être 0)"
FROM inventory_level;

SELECT '✅ NETTOYAGE TERMINÉ - Prêt pour la production!' as status;
