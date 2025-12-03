import { Pool } from "pg"

export interface Avis {
  id: string
  name: string
  email: string
  city: string
  rating: number
  message: string
  createdAt: string
  published: boolean
  canPublish: boolean
}

// Connexion PostgreSQL via DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

// Créer la table si elle n'existe pas
async function ensureTable() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_reviews (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        city VARCHAR(255),
        rating INTEGER DEFAULT 5,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        published BOOLEAN DEFAULT FALSE,
        can_publish BOOLEAN DEFAULT FALSE
      )
    `)
  } finally {
    client.release()
  }
}

// Initialiser la table au démarrage
ensureTable().catch(console.error)

// Récupérer tous les avis
export async function getAvisFromDB(): Promise<Avis[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT id, name, email, city, rating, message, 
             created_at as "createdAt", published, can_publish as "canPublish"
      FROM customer_reviews 
      ORDER BY created_at DESC
    `)
    return result.rows
  } finally {
    client.release()
  }
}

// Sauvegarder un nouvel avis
export async function saveAvisToDB(avis: Avis): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query(`
      INSERT INTO customer_reviews (id, name, email, city, rating, message, created_at, published, can_publish)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      avis.id,
      avis.name,
      avis.email,
      avis.city || "",
      avis.rating,
      avis.message,
      avis.createdAt,
      avis.published,
      avis.canPublish,
    ])
    return true
  } catch (error) {
    console.error("Erreur saveAvisToDB:", error)
    return false
  } finally {
    client.release()
  }
}

// Mettre à jour un avis
export async function updateAvisInDB(id: string, updates: Partial<Avis>): Promise<boolean> {
  const client = await pool.connect()
  try {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.published !== undefined) {
      setClauses.push(`published = $${paramIndex++}`)
      values.push(updates.published)
    }
    if (updates.canPublish !== undefined) {
      setClauses.push(`can_publish = $${paramIndex++}`)
      values.push(updates.canPublish)
    }

    if (setClauses.length === 0) return false

    values.push(id)
    const result = await client.query(`
      UPDATE customer_reviews 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
    `, values)

    return result.rowCount !== null && result.rowCount > 0
  } catch (error) {
    console.error("Erreur updateAvisInDB:", error)
    return false
  } finally {
    client.release()
  }
}

// Supprimer un avis
export async function deleteAvisFromDB(id: string): Promise<boolean> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      DELETE FROM customer_reviews WHERE id = $1
    `, [id])
    return result.rowCount !== null && result.rowCount > 0
  } catch (error) {
    console.error("Erreur deleteAvisFromDB:", error)
    return false
  } finally {
    client.release()
  }
}
