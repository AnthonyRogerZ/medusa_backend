import type { MedusaContainer } from "@medusajs/framework"
import corsLoader from "./cors"
import fixRegionLoader from "./fix-region"
import warmupLoader from "./warmup"

export default async function loaders(container: MedusaContainer) {
  await corsLoader(container)
  // Optional one-shot fix: run only if env is set
  await fixRegionLoader(container)
  // Kick off warmup (non-blocking)
  await warmupLoader(container)
}
