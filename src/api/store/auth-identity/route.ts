import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /store/auth-identity
 * Récupère les métadonnées de l'auth_identity de l'utilisateur connecté
 * Utilisé pour récupérer l'email Google lors de l'OAuth
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Récupérer l'auth_identity_id depuis le token JWT
    const authIdentityId = (req as any).auth_context?.auth_identity_id
    
    if (!authIdentityId) {
      return res.status(401).json({ 
        error: "Non authentifié",
        message: "auth_identity_id non trouvé dans le token" 
      })
    }

    // Récupérer le module Auth
    const authModuleService = req.scope.resolve(Modules.AUTH)
    
    // Récupérer l'auth_identity avec ses métadonnées
    const authIdentity = await authModuleService.retrieveAuthIdentity(authIdentityId) as any
    
    if (!authIdentity) {
      return res.status(404).json({ 
        error: "Auth identity non trouvée" 
      })
    }

    console.log("Auth identity récupérée:", JSON.stringify(authIdentity, null, 2))

    // Extraire l'email depuis les métadonnées (différents emplacements possibles)
    const email = authIdentity.provider_metadata?.email 
      || authIdentity.user_metadata?.email
      || authIdentity.app_metadata?.email
      || null

    return res.json({
      auth_identity_id: authIdentityId,
      provider: authIdentity.provider || authIdentity.provider_id,
      email: email,
      user_metadata: authIdentity.user_metadata || {},
      provider_metadata: authIdentity.provider_metadata || {},
      app_metadata: authIdentity.app_metadata || {},
      // Retourner tout l'objet pour debug
      raw: authIdentity,
    })
  } catch (error: any) {
    console.error("Erreur récupération auth_identity:", error)
    return res.status(500).json({ 
      error: "Erreur serveur",
      message: error.message 
    })
  }
}
