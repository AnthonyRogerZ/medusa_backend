import type { SubscriberArgs } from "@medusajs/framework"
import { AuthWorkflowEvents } from "@medusajs/utils"
import { sendResendEmail } from "../lib/email/resend"

export const config = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}

const buildPasswordResetHtml = (resetUrl: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe - GomGom Bonbons</title>
</head>
<body style="margin:0;padding:0;background-color:#FFF5F8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF5F8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#FF6B9D 0%,#FF9EBB 50%,#C8F0E8 100%);padding:36px 32px 28px;text-align:center;">
              <img src="https://gomgombonbons.com/images/transparent.png"
                   alt="GomGom Bonbons"
                   width="110" height="110"
                   style="width:110px;height:110px;border-radius:50%;object-fit:contain;background:#ffffff;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);margin-bottom:14px;display:block;margin-left:auto;margin-right:auto;" />
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;text-shadow:0 1px 3px rgba(0,0,0,0.1);">GomGom'bonbons</h1>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Bonbons Halal Premium</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:#FFF5F8;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">🔐</div>
              </div>
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1A1A2E;text-align:center;">Réinitialisation de mot de passe</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555;text-align:center;">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:16px 0 36px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF3D7F);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(255,61,127,0.35);">
                      🔑 Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FFF5F8;border-left:4px solid #FF6B9D;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                      ⏱ Ce lien est valable <strong style="color:#FF6B9D;">1 heure</strong>.<br>
                      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe restera inchangé.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#bbb;word-break:break-all;">
                Lien alternatif : <a href="${resetUrl}" style="color:#FF6B9D;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FAFAFA;border-top:1px solid #F0F0F0;padding:24px 40px;text-align:center;">
              <div style="margin-bottom:12px;">
                <span style="display:inline-block;background:#FFF5F8;border-radius:20px;padding:6px 14px;font-size:12px;color:#FF6B9D;font-weight:600;margin:0 4px;">🟢 100% Halal</span>
                <span style="display:inline-block;background:#F0FBF8;border-radius:20px;padding:6px 14px;font-size:12px;color:#2EAF8B;font-weight:600;margin:0 4px;">✨ +100 variétés</span>
                <span style="display:inline-block;background:#FFF5F8;border-radius:20px;padding:6px 14px;font-size:12px;color:#FF6B9D;font-weight:600;margin:0 4px;">🚀 Envoi 48h</span>
              </div>
              <p style="margin:8px 0 0;font-size:12px;color:#bbb;">
                © 2026 GomGom Bonbons — <a href="https://gomgombonbons.com" style="color:#FF6B9D;text-decoration:none;">gomgombonbons.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

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
    : "Réinitialisation de votre mot de passe 🔑 GomGom Bonbons"

  try {
    await sendResendEmail({
      to,
      subject,
      html: buildPasswordResetHtml(resetUrl),
      text: `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe GomGom Bonbons.\n\nCliquez sur ce lien pour en choisir un nouveau :\n${resetUrl}\n\nCe lien est valable 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nL'équipe GomGom Bonbons 🍬`,
    })
    logger.info(`Password reset email sent to ${to}`)
  } catch (e: any) {
    logger.error(`Failed to send password reset email to ${to}: ${e?.message || e}`)
  }
}
