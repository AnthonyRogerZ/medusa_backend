import type { SubscriberArgs } from "@medusajs/framework"
import { CustomerWorkflowEvents } from "@medusajs/utils"
import { sendResendEmail } from "../lib/email/resend"
import { generateVerificationToken, hashToken } from "../lib/email-verification"

export const config = {
  event: CustomerWorkflowEvents.CREATED,
}

/**
 * Subscriber qui envoie un email de vérification quand un nouveau compte client est créé.
 * 
 * Le token est stocké dans customer.metadata.email_verification
 * Une fois vérifié, email_verified sera true et les commandes guest seront liées.
 */
export default async function handleCustomerEmailVerification({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as { 
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void 
  }

  // L'événement customer.created envoie un tableau d'objets avec id
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
      // 1. Récupérer les infos du nouveau client
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

      // Vérifier si déjà vérifié (ex: compte Google OAuth)
      if (customer.metadata?.email_verified === true) {
        logger.info(`[EMAIL-VERIFICATION] Customer ${customerId} already verified, skipping`)
        continue
      }

      const email = customer.email
      const firstName = customer.first_name || "Client"

      // 2. Générer un token de vérification
      const token = generateVerificationToken()
      const hashedToken = hashToken(token)

      // 3. Stocker le token hashé dans les metadata du customer
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

      // 4. Construire le lien de vérification
      const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}&customer_id=${encodeURIComponent(customerId)}`

      // 5. Envoyer l'email de vérification
      await sendResendEmail({
        to: email,
        subject: "Vérifiez votre adresse email - GomGom Bonbons",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #e91e63; margin: 0;">🍬 GomGom Bonbons</h1>
  </div>
  
  <h2 style="color: #333;">Bonjour ${firstName} !</h2>
  
  <p>Merci d'avoir créé votre compte chez GomGom Bonbons.</p>
  
  <p>Pour finaliser votre inscription et accéder à toutes les fonctionnalités de votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${verificationUrl}" style="background-color: #e91e63; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
      Vérifier mon email
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px;">
    Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
    <a href="${verificationUrl}" style="color: #e91e63; word-break: break-all;">${verificationUrl}</a>
  </p>
  
  <p style="color: #666; font-size: 14px;">
    Ce lien est valable pendant 24 heures.
  </p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px; text-align: center;">
    Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
  </p>
</body>
</html>
        `,
        text: `Bonjour ${firstName},

Merci d'avoir créé votre compte chez GomGom Bonbons.

Pour vérifier votre adresse email, cliquez sur ce lien :
${verificationUrl}

Ce lien est valable pendant 24 heures.

Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.

L'équipe GomGom Bonbons`,
      })

      logger.info(`[EMAIL-VERIFICATION] Verification email sent to ${email} for customer ${customerId}`)

    } catch (error: any) {
      logger.error(`[EMAIL-VERIFICATION] Error for customer ${customerId}: ${error?.message || error}`)
    }
  }
}
