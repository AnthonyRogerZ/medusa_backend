import { createHmac, timingSafeEqual } from "crypto"

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 jours

type TokenOptions = {
  now?: number
  ttlMs?: number
}

function base64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function sign(orderId: string, expiresAt: number, secret: string): string {
  return base64Url(
    createHmac("sha256", secret)
      .update(`${orderId}.${expiresAt}`)
      .digest()
  )
}

export function createFulfillmentLinkToken(
  orderId: string,
  secret: string,
  options: TokenOptions = {}
): string {
  if (!orderId || !secret) {
    throw new Error("orderId and secret are required")
  }

  const now = options.now ?? Date.now()
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const expiresAt = now + ttlMs
  const signature = sign(orderId, expiresAt, secret)

  return `${expiresAt}.${signature}`
}

export function verifyFulfillmentLinkToken(
  orderId: string,
  token: string | undefined | null,
  secret: string | undefined,
  options: Pick<TokenOptions, "now"> = {}
): boolean {
  if (!orderId || !token || !secret) return false

  const [expiresAtRaw, receivedSignature] = token.split(".")
  if (!expiresAtRaw || !receivedSignature) return false

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt)) return false

  const now = options.now ?? Date.now()
  if (expiresAt < now) return false

  const expectedSignature = sign(orderId, expiresAt, secret)
  const received = Uint8Array.from(Buffer.from(receivedSignature))
  const expected = Uint8Array.from(Buffer.from(expectedSignature))

  if (received.length !== expected.length) return false

  return timingSafeEqual(received, expected)
}
