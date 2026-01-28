import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateAvisInDB, deleteAvisFromDB } from "../avis-service"

// PUT /store/avis/:id - Mettre à jour un avis
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const logger = req.scope.resolve("logger") as { info: (m: string) => void; error: (m: string, e?: unknown) => void }
    const { id } = req.params
    const updates = req.body as { published?: boolean; canPublish?: boolean }

    const updated = await updateAvisInDB(id, updates)

    if (updated) {
      logger.info(`📝 Avis ${id} mis à jour: ${JSON.stringify(updates)}`)
      res.json({ success: true })
    } else {
      res.status(404).json({ error: "Avis non trouvé" })
    }
  } catch (error) {
    const logger = req.scope.resolve("logger") as { error: (m: string, e?: unknown) => void }
    logger.error("❌ Erreur PUT /store/avis/:id:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
}

// DELETE /store/avis/:id - Supprimer un avis
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const logger = req.scope.resolve("logger") as { info: (m: string) => void; error: (m: string, e?: unknown) => void }
    const { id } = req.params

    const deleted = await deleteAvisFromDB(id)

    if (deleted) {
      logger.info(`🗑️ Avis ${id} supprimé`)
      res.json({ success: true })
    } else {
      res.status(404).json({ error: "Avis non trouvé" })
    }
  } catch (error) {
    const logger = req.scope.resolve("logger") as { error: (m: string, e?: unknown) => void }
    logger.error("❌ Erreur DELETE /store/avis/:id:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
}
