jest.mock("@medusajs/utils", () => ({
  ProductWorkflowEvents: {
    CREATED: "product.created",
    UPDATED: "product.updated",
  },
}))

import { applyDefaultShippingProfile, DEFAULT_SHIPPING_PROFILE_ID } from "./default-shipping-profile"

const createLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
})

describe("applyDefaultShippingProfile", () => {
  it("assigns the default shipping profile when product has none", async () => {
    const logger = createLogger()
    const remoteQuery = jest.fn().mockResolvedValue({
      id: "prod_missing",
      title: "Produit sans livraison",
      shipping_profile: null,
    })
    const updateProducts = jest.fn().mockResolvedValue({ id: "prod_missing" })

    await applyDefaultShippingProfile({
      productId: "prod_missing",
      remoteQuery,
      productModuleService: { updateProducts },
      logger,
    })

    expect(updateProducts).toHaveBeenCalledWith("prod_missing", {
      shipping_profile_id: DEFAULT_SHIPPING_PROFILE_ID,
    })
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Assigned Default Shipping Profile")
    )
  })

  it("skips products that already have a shipping profile", async () => {
    const logger = createLogger()
    const remoteQuery = jest.fn().mockResolvedValue({
      id: "prod_ok",
      title: "Produit OK",
      shipping_profile: { id: DEFAULT_SHIPPING_PROFILE_ID },
    })
    const updateProducts = jest.fn()

    await applyDefaultShippingProfile({
      productId: "prod_ok",
      remoteQuery,
      productModuleService: { updateProducts },
      logger,
    })

    expect(updateProducts).not.toHaveBeenCalled()
  })
})
