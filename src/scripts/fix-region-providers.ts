import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function fixRegionProviders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("🔧 Mise à jour des payment_providers de la région -> ['stripe']")

  // 1) Récupérer les régions existantes
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers"],
  })

  if (!regions.length) {
    logger.warn("⚠️ Aucune région trouvée. Rien à mettre à jour.")
    return
  }

  // Si une région s'appelle Europe, on la cible; sinon on prend la première
  const target = regions.find((r: any) => (r.name || "").toLowerCase() === "europe") || regions[0]

  logger.info(`📍 Région ciblée: ${target.name} (${target.id})`)
  logger.info(`   Providers AVANT: ${JSON.stringify(target.payment_providers || [])}`)

  // 2) Mettre à jour les payment_providers -> ["stripe"]
  const { result } = await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: target.id },
      update: {
        payment_providers: ["stripe"],
      },
    },
  })

  const updated = Array.isArray(result) ? result[0] : result
  logger.info(`✅ Mise à jour OK.`)
  logger.info(`   Providers APRÈS: ${JSON.stringify(updated?.payment_providers || [])}`)

  logger.info("🎉 Terminé. Relancez un test de checkout.")
}
