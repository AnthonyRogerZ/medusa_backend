import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateAvisInDB, deleteAvisFromDB } from "../avis-service"

// PUT /store/avis/:id - Mettre à jour un avis
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const updates = req.body as { published?: boolean; canPublish?: boolean }

    const updated = await updateAvisInDB(id, updates)

    if (updated) {
      console.log(`📝 Avis ${id} mis à jour:`, updates)
      res.json({ success: true })
    } else {
      res.status(404).json({ error: "Avis non trouvé" })
    }
  } catch (error) {
    console.error("❌ Erreur PUT /store/avis/:id:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
}

// DELETE /store/avis/:id - Supprimer un avis
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params

    const deleted = await deleteAvisFromDB(id)

    if (deleted) {
      console.log(`🗑️ Avis ${id} supprimé`)
      res.json({ success: true })
    } else {
      res.status(404).json({ error: "Avis non trouvé" })
    }
  } catch (error) {
    console.error("❌ Erreur DELETE /store/avis/:id:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
}
