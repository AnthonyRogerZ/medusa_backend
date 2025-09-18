import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows";

export default async function createAdminUser({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  
  logger.info("Creating admin user...");
  
  try {
    // Créer avec votre vraie adresse email
    const adminEmail = "pro.anthony23@gmail.com";
    
    const { result } = await createUserAccountWorkflow(container).run({
      input: {
        userData: {
          email: adminEmail,
          first_name: "Admin",
          last_name: "GomGom",
        },
        authIdentityId: adminEmail,
      },
    });
    
    logger.info(`✅ Admin user created successfully!`);
    logger.info(`📧 Email: ${adminEmail}`);
    logger.info(`🔑 You can now set a password via the admin interface or reset password`);
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
