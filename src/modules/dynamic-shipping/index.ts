import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import DynamicShippingService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [DynamicShippingService],
})
