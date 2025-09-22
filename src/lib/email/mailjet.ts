import Mailjet from "node-mailjet"

let client: ReturnType<typeof Mailjet.apiConnect> | null = null

export function getMailjetClient() {
  if (!client) {
    const apiKey = process.env.MAILJET_API_KEY
    const apiSecret = process.env.MAILJET_API_SECRET
    if (!apiKey || !apiSecret) {
      throw new Error("MAILJET_API_KEY/MAILJET_API_SECRET manquants")
    }
    client = Mailjet.apiConnect(apiKey, apiSecret)
  }
  return client
}

export async function sendMailjetEmail({
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
  const client = getMailjetClient()
  const FromEmail = process.env.MAILJET_FROM_EMAIL
  const FromName = process.env.MAILJET_FROM_NAME || "GomGom"
  if (!FromEmail) {
    throw new Error("MAILJET_FROM_EMAIL manquant")
  }

  const body = {
    Messages: [
      {
        From: { Email: FromEmail, Name: FromName },
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text || undefined,
        HTMLPart: html || undefined,
      },
    ],
  }

  const res = await client.post("send", { version: "v3.1" }).request(body)
  try {
    // node-mailjet ne fournit pas de types stricts pour res.body -> on caste en any
    const bodyAny = (res as any)?.body as any
    const message = bodyAny?.Messages?.[0]
    const msgId = message?.To?.[0]?.MessageID || message?.To?.[0]?.MessageId || message?.MessageID
    // Best-effort console log for tracing in server logs
    // eslint-disable-next-line no-console
    console.info(`[mailjet] Sent "${subject}" to ${to} MessageID=${msgId ?? "unknown"}`)
  } catch {}
  return res
}
