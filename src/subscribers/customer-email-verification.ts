import type { SubscriberArgs } from "@medusajs/framework"
import { CustomerWorkflowEvents } from "@medusajs/utils"
import { sendResendEmail } from "../lib/email/resend"
import { generateVerificationToken, hashToken } from "../lib/email-verification"

export const config = {
  event: CustomerWorkflowEvents.CREATED,
}

// ─── LE NOUVEAU TEMPLATE EMAIL AVEC LOGO & COULEURS CLIENT ───
const buildVerificationEmailHtml = (firstName: string, verificationUrl: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez GomGom</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAFA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;border:1px solid #F3F4F6;overflow:hidden;">
          
          <tr>
            <td align="center" style="padding:48px 40px 32px;">
              <a href="https://gomgombonbons.com" style="display:block;margin:0 auto 20px;width:90px;">
                <img src="https://gomgombonbons.com/images/transparent.png"
                     alt="GomGom Bonbons"
                     width="90" height="90"
                     style="width:90px;height:90px;border-radius:50%;object-fit:contain;display:block;" />
              </a>
              
              <span style="display:inline-block;padding:6px 16px;border-radius:50px;background-color:#89E1DD;color:#0f5150;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">
                L'Excellence GomGom
              </span>
              
              <h1 style="margin:0;font-family:Georgia, 'Times New Roman', serif;font-size:36px;font-style:italic;color:#9f1239;font-weight:normal;letter-spacing:0.5px;">
                Bienvenue.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 48px 40px;text-align:center;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">Bonjour ${firstName},</h2>
              
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#4B5563;">
                Nous sommes ravis de vous compter parmi nos clients privilégiés. Avant de pouvoir accéder à votre espace personnel et retrouver vos favoris, il ne reste qu'une petite étape pour confirmer votre adresse email.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 36px;">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background-color:#FFE1EA;color:#9f1239;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:50px;">
                      Confirmer mon compte
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">
                Ce lien est valable, par mesure de sécurité, pendant 24 heures.<br>
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
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

      // Envoi de l'email via Resend
      await sendResendEmail({
        to: email,
        subject: "Bienvenue chez GomGom — Confirmez votre adresse email",
        html: buildVerificationEmailHtml(firstName, verificationUrl),
        text: `Bonjour ${firstName},\n\nNous sommes ravis de vous compter parmi nos clients privilégiés. Pour confirmer votre adresse email, veuillez copier ce lien dans votre navigateur :\n${verificationUrl}\n\nCe lien est valable 24 heures.\n\nL'équipe GomGom.`,
      })

      logger.info(`[EMAIL-VERIFICATION] Verification email sent to ${email} for customer ${customerId}`)
    } catch (error: any) {
      logger.error(`[EMAIL-VERIFICATION] Error for customer ${customerId}: ${error?.message || error}`)
    }
  }
}