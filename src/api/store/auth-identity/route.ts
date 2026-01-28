import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

/**
 * GET /store/auth-identity
 * Récupère les métadonnées de l'auth_identity de l'utilisateur connecté
 * Utilisé pour récupérer l'email Google lors de l'OAuth
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Non authentifié",
        message: "Token manquant dans le header Authorization" 
      })
    }

    const token = authHeader.substring(7) // Enlever "Bearer "
    
    // Décoder le token (sans vérification car on veut juste l'auth_identity_id)
    let decodedToken: any
    try {
      decodedToken = jwt.decode(token)
    } catch (e) {
      return res.status(401).json({ 
        error: "Token invalide",
        message: "Impossible de décoder le token" 
      })
    }

    const authIdentityId = decodedToken?.auth_identity_id
    
    if (!authIdentityId) {
      return res.status(401).json({ 
        error: "Non authentifié",
        message: "auth_identity_id non trouvé dans le token",
        decoded: decodedToken
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
    const logger = req.scope.resolve("logger") as { error: (message: string, error?: unknown) => void }
    logger.error("Erreur récupération auth_identity:", error)
    return res.status(500).json({ 
      error: "Erreur serveur",
      message: error.message 
    })
  }
}
