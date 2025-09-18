import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function createAdminUser({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  
  logger.info("Creating admin user with password...");
  
  try {
    const adminEmail = "pro.anthony23@gmail.com";
    const adminPassword = "AdminGomGom2024!";
    
    // Utiliser le module d'authentification directement
    const authModuleService = container.resolve(Modules.AUTH);
    const userModuleService = container.resolve(Modules.USER);
    
    // Créer l'utilisateur
    const user = await userModuleService.createUsers({
      email: adminEmail,
      first_name: "Admin",
      last_name: "GomGom",
    });
    
    // Créer l'identité d'authentification avec mot de passe
    await authModuleService.createAuthIdentities({
      provider: "emailpass",
      entity_id: user.id,
      provider_metadata: {
        email: adminEmail,
        password: adminPassword,
      },
    } as any);
    
    logger.info(`✅ Admin user created successfully!`);
    logger.info(`📧 Email: ${adminEmail}`);
    logger.info(`🔑 Password: ${adminPassword}`);
    logger.info(`🌐 Login at: https://medusabackend-production-e0e9.up.railway.app/app/login`);
    
  } catch (error) {
    logger.error("❌ Error creating admin user:", error);
    
    // Si l'utilisateur existe déjà, c'est OK
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      logger.info("✅ Admin user already exists!");
      logger.info(`📧 Email: pro.anthony23@gmail.com`);
      logger.info(`🔑 Use password reset if you forgot your password`);
    } else {
      throw error;
    }
  }
}
