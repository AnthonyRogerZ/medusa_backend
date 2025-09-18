import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function fixRegionLoader(container: MedusaContainer) {
  if (process.env.FIX_REGION_PROVIDERS !== "true") {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    logger.info("[fix-region] Démarrage du fix -> payment_providers = ['stripe']")

    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "name", "payment_providers"],
    })

    if (!regions?.length) {
      logger.warn("[fix-region] Aucune région trouvée. Rien à faire.")
      return
    }

    const target = regions.find((r: any) => (r.name || "").toLowerCase() === "europe") || regions[0]

    logger.info(`[fix-region] Région ciblée: ${target.name} (${target.id})`)
    logger.info(`[fix-region] Providers AVANT: ${JSON.stringify(target.payment_providers || [])}`)

    const { result } = await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: target.id },
        update: {
          payment_providers: ["stripe"],
        },
      },
    })

    const updated = Array.isArray(result) ? result[0] : result

    logger.info(`[fix-region] Providers APRÈS: ${JSON.stringify(updated?.payment_providers || [])}`)
    logger.info("[fix-region] ✅ Terminé. Vous pouvez retirer FIX_REGION_PROVIDERS=true de vos variables d'env.")
  } catch (e) {
    logger.error("[fix-region] ❌ Erreur lors de la mise à jour des providers de région:", e as any)
  }
}
