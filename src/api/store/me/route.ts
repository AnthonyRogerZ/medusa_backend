import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  console.log(`[ROUTE DEBUG] GET /store/me called - redirecting to /store/customers/me`)
  
  // Rediriger vers la vraie route
  return res.status(301).json({
    message: "This route has been moved. Use /store/customers/me instead.",
    redirect_to: "/store/customers/me"
  })
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  console.log(`[ROUTE DEBUG] OPTIONS /store/me called`)
  return res.status(200).end()
}
