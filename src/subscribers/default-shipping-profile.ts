import type { SubscriberArgs } from "@medusajs/framework"
import { ProductWorkflowEvents } from "@medusajs/utils"

export const DEFAULT_SHIPPING_PROFILE_ID =
  process.env.DEFAULT_SHIPPING_PROFILE_ID || "sp_01K4R1SKQECRBP746HAE675RPC"

type Logger = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

type RemoteQuery = (query: {
  entryPoint: string
  fields: string[]
  variables: { id: string }
}) => Promise<ProductRecord | ProductRecord[] | null>

type ProductModuleService = {
  updateProducts: (
    id: string,
    data: { shipping_profile_id: string }
  ) => Promise<unknown>
}

type ProductRecord = {
  id: string
  title?: string
  shipping_profile?: { id?: string } | null
}

type ProductEventPayload =
  | { id?: string }
  | Array<{ id?: string }>
  | { products?: Array<{ id?: string }> }

const normalizeProductIds = (payload: ProductEventPayload): string[] => {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { products?: Array<{ id?: string }> }).products)
      ? (payload as { products: Array<{ id?: string }> }).products
      : [payload as { id?: string }]

  return [...new Set(records.map((record) => record?.id).filter(Boolean) as string[])]
}

const normalizeProductResult = (
  product: ProductRecord | ProductRecord[] | null
): ProductRecord | null => {
  if (Array.isArray(product)) {
    return product[0] ?? null
  }

  return product
}

export const applyDefaultShippingProfile = async ({
  productId,
  remoteQuery,
  productModuleService,
  logger,
}: {
  productId: string
  remoteQuery: RemoteQuery
  productModuleService: ProductModuleService
  logger: Logger
}) => {
  const product = normalizeProductResult(
    await remoteQuery({
      entryPoint: "product",
      fields: ["id", "title", "shipping_profile.id"],
      variables: { id: productId },
    })
  )

  if (!product) {
    logger.warn(`[DEFAULT-SHIPPING] Product not found: ${productId}`)
    return
  }

  if (product.shipping_profile?.id) {
    logger.info(
      `[DEFAULT-SHIPPING] Skipped ${product.id} (${product.title || "Untitled"}) - shipping profile already set`
    )
    return
  }

  await productModuleService.updateProducts(product.id, {
    shipping_profile_id: DEFAULT_SHIPPING_PROFILE_ID,
  })

  logger.info(
    `[DEFAULT-SHIPPING] Assigned Default Shipping Profile to ${product.id} (${product.title || "Untitled"})`
  )
}

export const config = {
  event: [ProductWorkflowEvents.CREATED, ProductWorkflowEvents.UPDATED],
}

export default async function handleDefaultShippingProfile({
  event,
  container,
}: SubscriberArgs<ProductEventPayload>) {
  const logger = container.resolve("logger") as Logger
  const remoteQuery = container.resolve("remoteQuery") as RemoteQuery
  const productModuleService = container.resolve("product") as ProductModuleService

  const productIds = normalizeProductIds(event.data)

  if (!productIds.length) {
    logger.warn("[DEFAULT-SHIPPING] No product ids in event payload")
    return
  }

  for (const productId of productIds) {
    try {
      await applyDefaultShippingProfile({
        productId,
        remoteQuery,
        productModuleService,
        logger,
      })
    } catch (error) {
      logger.error(
        `[DEFAULT-SHIPPING] Failed to assign default shipping profile to ${productId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }
}
