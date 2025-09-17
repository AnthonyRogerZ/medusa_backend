import { Request, Response } from "express"
import { ContainerRegistrationKeys } from "@medusajs/utils"

export const GET = async (req: Request & { scope: any }, res: Response) => {
  const { id } = req.params

  try {
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    
    // Get product with variants and prices
    const products = await remoteQuery({
      entryPoint: "product",
      fields: [
        "id",
        "title", 
        "description",
        "handle",
        "thumbnail",
        "images.*",
        "variants.*",
        "variants.prices.*"
      ],
      filters: { id }
    })

    const product = products?.[0]

    if (!product) {
      return res.status(404).json({
        type: "not_found",
        message: "Product not found"
      })
    }

    res.status(200).json({ product })
  } catch (error) {
    console.error("Error fetching product:", error)
    res.status(500).json({
      type: "unknown_error",
      message: "An unknown error occurred."
    })
  }
}
