import { createFulfillmentLinkToken, verifyFulfillmentLinkToken } from "./fulfillment-link-token"

describe("fulfillment link token", () => {
  const secret = "test-secret-with-enough-entropy"
  const orderId = "order_01KQT5FSZNZ0VC22J020T18ZHG"
  const now = 1_777_980_000_000

  it("accepts only untampered tokens for the matching order before expiry", () => {
    const token = createFulfillmentLinkToken(orderId, secret, { now, ttlMs: 60_000 })

    expect(verifyFulfillmentLinkToken(orderId, token, secret, { now: now + 1_000 })).toBe(true)
    expect(verifyFulfillmentLinkToken("order_other", token, secret, { now: now + 1_000 })).toBe(false)
    expect(verifyFulfillmentLinkToken(orderId, token.replace(/.$/, "x"), secret, { now: now + 1_000 })).toBe(false)
    expect(verifyFulfillmentLinkToken(orderId, token, secret, { now: now + 61_000 })).toBe(false)
  })
})
