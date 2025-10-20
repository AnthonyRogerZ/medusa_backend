-- Script SQL pour vérifier les shipping profiles des produits

-- 1. Voir les shipping profiles disponibles
SELECT id, name, type, created_at 
FROM shipping_profile 
ORDER BY created_at;

-- 2. Compter les produits avec et sans profile
SELECT 
  CASE 
    WHEN profile_id IS NULL THEN '❌ Sans profile'
    ELSE '✅ Avec profile'
  END as status,
  COUNT(*) as nombre_produits
FROM product
GROUP BY profile_id IS NULL;

-- 3. Liste des produits SANS profile (problématiques)
SELECT id, title, handle, profile_id
FROM product
WHERE profile_id IS NULL
LIMIT 20;

-- 4. Liste des produits AVEC profile (OK)
SELECT p.id, p.title, p.handle, p.profile_id, sp.name as profile_name
FROM product p
LEFT JOIN shipping_profile sp ON p.profile_id = sp.id
WHERE p.profile_id IS NOT NULL
LIMIT 20;

-- 5. SOLUTION : Assigner le default profile à tous les produits sans profile
-- DÉCOMMENTE LA LIGNE CI-DESSOUS POUR CORRIGER :
-- UPDATE product SET profile_id = (SELECT id FROM shipping_profile WHERE type = 'default' LIMIT 1) WHERE profile_id IS NULL;
