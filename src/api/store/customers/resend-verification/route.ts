import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendMailjetEmail } from "../../../../lib/email/mailjet"
import { generateVerificationToken, hashToken } from "../../../../lib/email-verification"

/**
 * POST /store/customers/resend-verification
 * 
 * Renvoie l'email de vérification pour un client.
 * Nécessite que le client soit authentifié.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") as any
  
  try {
    // Récupérer le customer_id depuis la session ou le body
    const customer_id = (req as any).auth_context?.actor_id || (req.body as any)?.customer_id

    if (!customer_id) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      })
    }

    const fromEmail = process.env.MAILJET_FROM_EMAIL
    if (!fromEmail) {
      return res.status(500).json({
        success: false,
        message: "Service email non configuré",
      })
    }

    const frontendUrl = process.env.FRONTEND_URL || "https://gomgom-bonbons.vercel.app"
    const remoteQuery = req.scope.resolve("remoteQuery") as any
    const customerModuleService = req.scope.resolve("customer") as any

    // Récupérer le customer
    const customerResult = await remoteQuery({
      entryPoint: "customer",
      fields: ["id", "email", "first_name", "metadata"],
      variables: { id: customer_id },
    })

    const customer = Array.isArray(customerResult) ? customerResult[0] : customerResult
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Client non trouvé",
      })
    }

    // Vérifier si déjà vérifié
    if (customer.metadata?.email_verified === true) {
      return res.status(200).json({
        success: true,
        message: "Email déjà vérifié",
        already_verified: true,
      })
    }

    const email = customer.email
    const firstName = customer.first_name || "Client"

    // Générer un nouveau token
    const token = generateVerificationToken()
    const hashedToken = hashToken(token)

    // Mettre à jour les metadata
    await customerModuleService.updateCustomers(customer_id, {
      metadata: {
        ...customer.metadata,
        email_verification: {
          token_hash: hashedToken,
          created_at: new Date().toISOString(),
        },
        email_verified: false,
      },
    })

    // Construire le lien
    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}&customer_id=${encodeURIComponent(customer_id)}`

    // Envoyer l'email
    await sendMailjetEmail({
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
  
  <p>Vous avez demandé un nouveau lien de vérification pour votre compte.</p>
  
  <p>Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
  
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
    Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email.
  </p>
</body>
</html>
      `,
      text: `Bonjour ${firstName},

Vous avez demandé un nouveau lien de vérification pour votre compte.

Pour vérifier votre adresse email, cliquez sur ce lien :
${verificationUrl}

Ce lien est valable pendant 24 heures.

Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email.

L'équipe GomGom Bonbons`,
    })

    logger.info(`[RESEND-VERIFICATION] Verification email resent to ${email} for customer ${customer_id}`)

    return res.status(200).json({
      success: true,
      message: "Email de vérification envoyé",
    })

  } catch (error: any) {
    logger.error(`[RESEND-VERIFICATION] Error: ${error?.message || error}`)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de l'email",
    })
  }
}
