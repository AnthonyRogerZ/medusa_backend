import type { MedusaContainer } from "@medusajs/framework"

const redisLoader = async (container: MedusaContainer) => {
  const logger = container.resolve("logger")
  logger.info("Redis loader disabled: using in-memory modules")
}

export default redisLoader
