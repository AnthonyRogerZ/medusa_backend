import type { MedusaContainer } from "@medusajs/framework"

/**
 * Lightweight warmup to accelerate first requests after deploy or cold start.
 * - Runs asynchronously (doesn't block server start)
 * - Uses module services directly to avoid needing external HTTP
 * - Keeps scope very small to limit DB/Redis load
 */
const warmupLoader = async (container: MedusaContainer) => {
  const logger = container.resolve("logger")

  // Run asynchronously so we don't delay boot
  setTimeout(async () => {
    try {
      logger.info("Warmup: starting prefetch (products, collections)")

      // Try to resolve services if present (v2 module keys)
      let productService: any
      let collectionService: any

      try {
        productService = (container as any).hasRegistration?.("product")
          ? container.resolve("product")
          : null
      } catch {}

      try {
        collectionService = (container as any).hasRegistration?.("productCollection")
          ? container.resolve("productCollection")
          : null
      } catch {}

      // Prefetch tiny slices to populate caches and DB query plans
      const tasks: Promise<any>[] = []

      if (productService?.list) {
        tasks.push(
          productService
            .list({ status: ["published"] }, { take: 12, skip: 0 })
            .catch(() => void 0)
        )
      } else if (productService?.listAndCount) {
        tasks.push(
          productService
            .listAndCount({ status: ["published"] }, { take: 12, skip: 0 })
            .catch(() => void 0)
        )
      }

      if (collectionService?.list) {
        tasks.push(collectionService.list({}, { take: 8, skip: 0 }).catch(() => void 0))
      } else if (collectionService?.listAndCount) {
        tasks.push(
          collectionService
            .listAndCount({}, { take: 8, skip: 0 })
            .catch(() => void 0)
        )
      }

      // Race with a timeout so we never hang
      const timeout = new Promise((resolve) => setTimeout(resolve, 3500))
      await Promise.race([Promise.allSettled(tasks), timeout])

      logger.info("Warmup: finished")
    } catch (e) {
      logger.warn(`Warmup: skipped due to error: ${e}`)
    }
  }, 0)
}

export default warmupLoader
