import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function cleanupUsers({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModuleService = container.resolve(Modules.USER);
  
  logger.info("🧹 Nettoyage des anciens utilisateurs...");
  
  try {
    // Lister tous les utilisateurs
    const users = await userModuleService.listUsers();
    
    logger.info(`📋 ${users.length} utilisateur(s) trouvé(s):`);
    
    for (const user of users) {
      logger.info(`   - ${user.email} (ID: ${user.id})`);
    }
    
    // Utilisateurs à supprimer (gardez seulement pro.anthony23@gmail.com)
    const emailsToDelete = [
      "emmaa.gomes@gmail.com",
      "admin@tondomaine.com", 
      "admin@gomgombonbons.com"
    ];
    
    for (const email of emailsToDelete) {
      const userToDelete = users.find(u => u.email === email);
      if (userToDelete) {
        await userModuleService.deleteUsers([userToDelete.id]);
        logger.info(`✅ Utilisateur supprimé: ${email}`);
      } else {
        logger.info(`⚠️  Utilisateur non trouvé: ${email}`);
      }
    }
    
    logger.info(`🎯 Nettoyage terminé ! Seul pro.anthony23@gmail.com reste actif.`);
    
  } catch (error) {
    logger.error("❌ Erreur lors du nettoyage:", error);
  }
}
