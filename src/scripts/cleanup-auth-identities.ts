import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function cleanupAuthIdentities({ container }: ExecArgs) {
  const authModuleService = container.resolve(Modules.AUTH)
  
  console.log("Recherche des auth_identities Google sans email...")
  
  // Récupérer toutes les auth_identities
  const authIdentities = await authModuleService.listAuthIdentities({})
  
  console.log(`Trouvé ${authIdentities.length} auth_identities`)
  
  for (const identity of authIdentities) {
    const hasEmail = (identity as any).provider_metadata?.email || 
                     (identity as any).user_metadata?.email ||
                     (identity as any).app_metadata?.email
    
    if (!hasEmail) {
      console.log(`Suppression de ${identity.id} (pas d'email)...`)
      await authModuleService.deleteAuthIdentities([identity.id])
      console.log(`✓ Supprimé: ${identity.id}`)
    } else {
      console.log(`Conservé: ${identity.id} (email présent)`)
    }
  }
  
  console.log("Nettoyage terminé!")
}
