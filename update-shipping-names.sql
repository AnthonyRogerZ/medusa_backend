-- Script SQL pour mettre à jour les noms des options de livraison
-- À exécuter dans la base de données PostgreSQL sur Railway

-- Mettre à jour le nom de Chronopost
UPDATE shipping_option 
SET name = 'Chronopost Relais (48h)'
WHERE provider_id = 'dynamic-shipping' 
  AND data->>'id' = 'chronopost';

-- Vérifier les noms actuels
SELECT id, name, provider_id, data 
FROM shipping_option 
WHERE provider_id = 'dynamic-shipping';
