import crypto from "crypto"

/**
 * Génère un token de vérification d'email sécurisé
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Génère un hash du token pour stockage sécurisé
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Vérifie si un token correspond au hash stocké
 */
export function verifyToken(token: string, hashedToken: string): boolean {
  const hash = hashToken(token)
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken))
}

/**
 * Durée de validité du token de vérification (24 heures)
 */
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24

/**
 * Vérifie si un token a expiré
 */
export function isTokenExpired(createdAt: Date, expiryHours: number = VERIFICATION_TOKEN_EXPIRY_HOURS): boolean {
  const now = new Date()
  const expiryTime = new Date(createdAt.getTime() + expiryHours * 60 * 60 * 1000)
  return now > expiryTime
}
