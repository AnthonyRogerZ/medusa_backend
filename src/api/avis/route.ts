import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAvisFromDB, saveAvisToDB, Avis } from "./avis-service"

// GET /store/avis - Récupérer les avis
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const logger = req.scope.resolve("logger") as { info: (m: string) => void; error: (m: string, e?: unknown) => void }
    const showAll = req.query.all === "true"
    const avis = await getAvisFromDB()
    
    const filteredAvis = showAll ? avis : avis.filter(a => a.published)
    
    res.json({
      avis: filteredAvis,
      total: avis.length,
      published: avis.filter(a => a.published).length,
    })
  } catch (error) {
    const logger = req.scope.resolve("logger") as { error: (m: string, e?: unknown) => void }
    logger.error("❌ Erreur GET /store/avis:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
}

// POST /store/avis - Créer un nouvel avis
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const logger = req.scope.resolve("logger") as { info: (m: string) => void; error: (m: string, e?: unknown) => void }
    const avis = req.body as Avis
    
    if (!avis.id || !avis.name || !avis.email || !avis.message) {
      return res.status(400).json({ error: "Données manquantes" })
    }

    const saved = await saveAvisToDB(avis)
    
    if (saved) {
      logger.info(`📝 Nouvel avis: ${avis.name} (${avis.email}) - ${avis.rating}/5`)
      res.json({ success: true, avis })
    } else {
      res.status(500).json({ error: "Erreur lors de la sauvegarde" })
    }
  } catch (error) {
    const logger = req.scope.resolve("logger") as { error: (m: string, e?: unknown) => void }
    logger.error("❌ Erreur POST /store/avis:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
}
