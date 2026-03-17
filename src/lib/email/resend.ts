import { Resend } from "resend"

let client: Resend | null = null

export function getResendClient() {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY manquant")
    }
    client = new Resend(apiKey)
  }
  return client
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html?: string
  text?: string
}) {
  const resend = getResendClient()

  const from = process.env.RESEND_FROM_EMAIL || "no-reply@gomgombonbons.com"
  const fromName = process.env.RESEND_FROM_NAME || "GomGom Bonbons"
  const replyTo = process.env.RESEND_REPLY_TO || "contact@gomgombonbons.com"

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${from}>`,
    to: [to],
    subject,
    html,
    text,
    reply_to: replyTo,
  })

  if (error) {
    throw new Error(`[resend] Erreur envoi email: ${error.message}`)
  }

  // eslint-disable-next-line no-console
  console.info(`[resend] Sent "${subject}" to ${to} id=${data?.id ?? "unknown"}`)

  return data
}
