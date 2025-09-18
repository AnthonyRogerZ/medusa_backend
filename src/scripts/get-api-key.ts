import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function getPublishableApiKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  
  logger.info("🔍 Recherche de la clé API publishable...");
  
  try {
    // Récupérer toutes les clés API
    const { data: apiKeys } = await query.graph({
      entity: "api_key",
      fields: ["id", "title", "token", "type", "created_at"],
    });
    
    logger.info(`📋 ${apiKeys.length} clé(s) API trouvée(s):`);
    
    for (const key of apiKeys) {
      logger.info(`\n🔑 Clé API:`);
      logger.info(`   ID: ${key.id}`);
      logger.info(`   Title: ${key.title}`);
      logger.info(`   Type: ${key.type}`);
      logger.info(`   Token: ${key.token}`);
      logger.info(`   Created: ${key.created_at}`);
      
      if (key.type === "publishable") {
        logger.info(`\n✅ CLÉS PUBLISHABLE TROUVÉE !`);
        logger.info(`🚀 Utilisez cette clé dans votre frontend:`);
        logger.info(`   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${key.token}`);
        logger.info(`\n📝 À configurer sur Vercel dans les variables d'environnement !`);
      }
    }
    
    const publishableKeys = apiKeys.filter(key => key.type === "publishable");
    
    if (publishableKeys.length === 0) {
      logger.warn(`\n⚠️  AUCUNE CLÉ PUBLISHABLE TROUVÉE !`);
      logger.info(`💡 Il faut en créer une avec le script seed ou manuellement`);
      logger.info(`🔧 Exécutez: npm run seed`);
    }
    
  } catch (error) {
    logger.error("❌ Erreur lors de la récupération des clés API:", error);
    
    // Essayons une approche alternative
    try {
      logger.info("🔄 Tentative avec une approche alternative...");
      
      const apiKeyModuleService = container.resolve(Modules.API_KEY);
      const keys = await apiKeyModuleService.listApiKeys();
      
      logger.info(`📋 ${keys.length} clé(s) trouvée(s) via le module API_KEY:`);
      
      for (const key of keys) {
        logger.info(`\n🔑 Clé API:`);
        logger.info(`   ID: ${key.id}`);
        logger.info(`   Title: ${key.title}`);
        logger.info(`   Type: ${key.type}`);
        logger.info(`   Token: ${key.token}`);
        
        if (key.type === "publishable") {
          logger.info(`\n✅ CLÉ PUBLISHABLE TROUVÉE !`);
          logger.info(`🚀 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${key.token}`);
        }
      }
      
    } catch (altError) {
      logger.error("❌ Erreur avec l'approche alternative:", altError);
    }
  }
}
