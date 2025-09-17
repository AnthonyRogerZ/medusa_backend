import type { MedusaContainer } from "@medusajs/framework"
import corsLoader from "./cors"

export default async function loaders(container: MedusaContainer) {
  await corsLoader(container)
}
