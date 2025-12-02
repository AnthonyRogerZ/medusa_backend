import type { SubscriberArgs } from "@medusajs/framework"
import { AuthWorkflowEvents } from "@medusajs/utils"
import { sendMailjetEmail } from "../lib/email/mailjet"

export const config = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}

export default async function handleAuthPasswordReset({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

  let to = (event.data as any)?.entity_id as string | undefined
  const actor_type = (event.data as any)?.actor_type as string | undefined
  const token = (event.data as any)?.token as string | undefined

  if (!token) {
    logger.warn("Password reset event missing token; skipping.")
    return
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://gomgom-bonbons.vercel.app"
  const fromEmail = process.env.MAILJET_FROM_EMAIL
  if (!fromEmail) {
    logger.warn("MAILJET_FROM_EMAIL n'est pas défini. Envoi email réinitialisation ignoré.")
    return
  }

  // If entity_id is not an email, try resolving a customer by id
  if (!to || !to.includes("@")) {
    try {
      const remoteQuery = container.resolve("remoteQuery") as any
      const result = await remoteQuery({
        entryPoint: "customer",
        fields: ["id", "email"],
        variables: { id: to || (event.data as any)?.entity_id },
      })
      const customer = Array.isArray(result) ? result[0] : result
      if (customer?.email) to = customer.email
    } catch (e: any) {
      logger.warn(`Failed to resolve email for password reset: ${e?.message || e}`)
    }
  }

  if (!to || !to.includes("@")) {
    logger.warn(`Could not determine email for password reset actor_type=${actor_type} entity_id=${(event.data as any)?.entity_id}`)
    return
  }

  // Pour les admins (user), utiliser l'URL du backend Railway
  // Pour les customers, utiliser l'URL du frontend
  const backendUrl = process.env.BACKEND_URL || "https://medusabackend-production-e0e9.up.railway.app"
  
  let resetUrl: string
  if (actor_type === "user") {
    // Admin reset - va vers l'admin Medusa
    resetUrl = `${backendUrl.replace(/\/?$/, "")}/app/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`
  } else {
    // Customer reset - va vers le frontend
    resetUrl = `${frontendUrl.replace(/\/?$/, "")}/fr/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`
  }

  const subject = actor_type === "user" ? "Réinitialisation du mot de passe (Admin)" : "Réinitialisation de votre mot de passe"

  try {
    await sendMailjetEmail({
      to,
      subject,
      text: `Bonjour,\n\nPour réinitialiser votre mot de passe, cliquez sur le lien suivant : ${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      html: `<p>Bonjour,</p><p>Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :</p><p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
    })
    logger.info(`Password reset email sent to ${to}`)
  } catch (e: any) {
    logger.error(`Failed to send password reset email to ${to}: ${e?.message || e}`)
  }
}
