import type { SubscriberArgs } from "@medusajs/framework"
import { AuthWorkflowEvents } from "@medusajs/utils"
import { sendResendEmail } from "../lib/email/resend"

export const config = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}

// ─── LE NOUVEAU TEMPLATE EMAIL "LUXE" AVEC LOGO CLIQUABLE ───
const buildPasswordResetHtml = (resetUrl: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe - GomGom Bonbons</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAFA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;border:1px solid #F3F4F6;overflow:hidden;">

          <tr>
            <td align="center" style="padding:48px 40px 16px;">
              
              <a href="https://gomgombonbons.com" style="display:block;margin:0 auto 24px;width:100px;">
                <img src="https://gomgombonbons.com/images/transparent.png"
                     alt="GomGom Bonbons"
                     width="100" height="100"
                     style="width:100px;height:100px;border-radius:50%;object-fit:contain;background:#ffffff;padding:8px;box-shadow:0 4px 20px rgba(0,0,0,0.06);display:block;" />
              </a>

              <span style="display:inline-block;padding:6px 16px;border-radius:50px;background-color:#89E1DD;color:#0f5150;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">
                Sécurité Compte
              </span>
              
              <h1 style="margin:0;font-family:Georgia, 'Times New Roman', serif;font-size:32px;font-style:italic;color:#9f1239;font-weight:normal;letter-spacing:0.5px;">
                Mot de passe oublié.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 48px 40px;text-align:center;">
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#4B5563;">
                Vous avez demandé à réinitialiser votre mot de passe GomGom. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe et retrouver l'accès à votre espace.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 36px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#FFE1EA;color:#9f1239;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:50px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">
                Ce lien sécurisé expirera dans 1 heure.<br>
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F9FAFB;border-top:1px solid #F3F4F6;padding:32px 48px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                © ${new Date().getFullYear()} GomGom Bonbons<br>
                L'art d'offrir la gourmandise.<br><br>
                <a href="https://gomgombonbons.com" style="color:#0f5150;text-decoration:none;font-weight:500;">gomgombonbons.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

// ─── LOGIQUE MEDUSA (Inchangée) ───
export default async function handleAuthPasswordReset({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
  }

  let to = (event.data as any)?.entity_id as string | undefined
  const actor_type = (event.data as any)?.actor_type as string | undefined
  const token = (event.data as any)?.token as string | undefined

  if (!token) {
    logger.warn("Password reset event missing token; skipping.")
    return
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://gomgombonbons.com"
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) {
    logger.warn("RESEND_FROM_EMAIL n'est pas défini. Envoi email réinitialisation ignoré.")
    return
  }

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

  const backendUrl = process.env.BACKEND_URL || "https://medusabackend-production-e0e9.up.railway.app"

  let resetUrl: string
  if (actor_type === "user") {
    resetUrl = `${backendUrl.replace(/\/?$/, "")}/app/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`
  } else {
    resetUrl = `${frontendUrl.replace(/\/?$/, "")}/fr/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`
  }

  const subject = actor_type === "user"
    ? "Réinitialisation du mot de passe (Admin) — GomGom Bonbons"
    : "Réinitialisez votre mot de passe — GomGom"

  try {
    await sendResendEmail({
      to,
      subject,
      html: buildPasswordResetHtml(resetUrl),
      text: `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe GomGom.\n\nCliquez sur ce lien pour en choisir un nouveau :\n${resetUrl}\n\nCe lien est valable 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nL'équipe GomGom.`,
    })
    logger.info(`Password reset email sent to ${to}`)
  } catch (e: any) {
    logger.error(`Failed to send password reset email to ${to}: ${e?.message || e}`)
  }
}