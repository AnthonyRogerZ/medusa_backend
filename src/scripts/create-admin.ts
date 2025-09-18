import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows";

export default async function createAdminUser({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  
  logger.info("Creating admin user...");
  
  try {
    const { result } = await createUserAccountWorkflow(container).run({
      input: {
        userData: {
          email: "admin@gomgombonbons.com",
          first_name: "Admin",
          last_name: "User",
        },
        authIdentityId: "admin@gomgombonbons.com",
      },
    });
    
    logger.info(`✅ Admin user created successfully!`);
    logger.info(`📧 Email: admin@gomgombonbons.com`);
    logger.info(`🔑 You can now set a password via the admin interface or reset password`);
    logger.info(`🌐 Login at: https://medusabackend-production-e0e9.up.railway.app/app/login`);
    
  } catch (error) {
    logger.error("❌ Error creating admin user:", error);
    
    // Si l'utilisateur existe déjà, c'est OK
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      logger.info("✅ Admin user already exists!");
      logger.info(`📧 Email: admin@gomgombonbons.com`);
      logger.info(`🔑 Use password reset if you forgot your password`);
    } else {
      throw error;
    }
  }
}
