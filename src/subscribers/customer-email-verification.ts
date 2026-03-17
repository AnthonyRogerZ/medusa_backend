import type { SubscriberArgs } from "@medusajs/framework"
import { CustomerWorkflowEvents } from "@medusajs/utils"
import { sendResendEmail } from "../lib/email/resend"
import { generateVerificationToken, hashToken } from "../lib/email-verification"

export const config = {
  event: CustomerWorkflowEvents.CREATED,
}

const buildVerificationEmailHtml = (firstName: string, verificationUrl: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérifiez votre email - GomGom Bonbons</title>
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
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1A1A2E;">Bienvenue, ${firstName} ! 🎉</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555;">
                Merci de rejoindre la famille GomGom Bonbons. Votre compte a bien été créé — il ne reste plus qu'une petite étape pour l'activer.
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#555;">
                Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et accéder à toutes les douceurs de votre espace personnel 🍭
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 36px;">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF3D7F);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(255,61,127,0.35);">
                      ✅ Vérifier mon adresse email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FFF5F8;border-left:4px solid #FF6B9D;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                      ⏱ Ce lien est valable <strong style="color:#FF6B9D;">24 heures</strong>.<br>
                      Si vous n'avez pas créé de compte, ignorez simplement cet email.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#bbb;word-break:break-all;">
                Lien alternatif : <a href="${verificationUrl}" style="color:#FF6B9D;">${verificationUrl}</a>
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

export default async function handleCustomerEmailVerification({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
  }

  const customers = event.data as { id: string }[] | { id: string }
  const customerList = Array.isArray(customers) ? customers : [customers]

  if (!customerList.length) {
    logger.warn("[EMAIL-VERIFICATION] No customer data in event")
    return
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) {
    logger.warn("[EMAIL-VERIFICATION] RESEND_FROM_EMAIL not configured, skipping verification email")
    return
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://gomgombonbons.com"
  const remoteQuery = container.resolve("remoteQuery") as any
  const customerModuleService = container.resolve("customer") as any

  for (const customerData of customerList) {
    const customerId = customerData.id
    if (!customerId) continue

    try {
      const customerResult = await remoteQuery({
        entryPoint: "customer",
        fields: ["id", "email", "first_name", "metadata"],
        variables: { id: customerId },
      })

      const customer = Array.isArray(customerResult) ? customerResult[0] : customerResult
      if (!customer?.email) {
        logger.warn(`[EMAIL-VERIFICATION] Customer ${customerId} has no email`)
        continue
      }

      if (customer.metadata?.email_verified === true) {
        logger.info(`[EMAIL-VERIFICATION] Customer ${customerId} already verified, skipping`)
        continue
      }

      const email = customer.email
      const firstName = customer.first_name || "cher client"

      const token = generateVerificationToken()
      const hashedToken = hashToken(token)

      await customerModuleService.updateCustomers(customerId, {
        metadata: {
          ...customer.metadata,
          email_verification: {
            token_hash: hashedToken,
            created_at: new Date().toISOString(),
          },
          email_verified: false,
        },
      })

      const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}&customer_id=${encodeURIComponent(customerId)}`

      await sendResendEmail({
        to: email,
        subject: "Vérifiez votre adresse email 🍬 GomGom Bonbons",
        html: buildVerificationEmailHtml(firstName, verificationUrl),
        text: `Bonjour ${firstName},\n\nMerci de rejoindre GomGom Bonbons !\n\nPour vérifier votre adresse email, cliquez sur ce lien :\n${verificationUrl}\n\nCe lien est valable 24 heures.\n\nSi vous n'avez pas créé de compte, ignorez cet email.\n\nL'équipe GomGom Bonbons 🍬`,
      })

      logger.info(`[EMAIL-VERIFICATION] Verification email sent to ${email} for customer ${customerId}`)
    } catch (error: any) {
      logger.error(`[EMAIL-VERIFICATION] Error for customer ${customerId}: ${error?.message || error}`)
    }
  }
}
