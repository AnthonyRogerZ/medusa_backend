import type { MedusaContainer } from "@medusajs/framework"
import corsLoader from "./cors"
import fixRegionLoader from "./fix-region"
import redisLoader from "./redis"
import warmupLoader from "./warmup"

export default async function loaders(container: MedusaContainer) {
  await corsLoader(container)
  // Optional one-shot fix: run only if env is set
  await fixRegionLoader(container)
  // Initialize Redis with Upstash
  await redisLoader(container)
  // Kick off warmup (non-blocking)
  await warmupLoader(container)
}
