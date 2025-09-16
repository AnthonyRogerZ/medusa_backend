import { Request, Response } from "express"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

export const POST = async (req: Request & { scope: any }, res: Response) => {
  const { id } = req.params
  const { provider_id, data = {} } = req.body

  try {
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    
    // Get cart with payment collection
    const [cart] = await remoteQuery({
      cart: {
        fields: ["id", "payment_collection.*"],
        filters: { id }
      }
    })

    if (!cart) {
      return res.status(404).json({
        type: "not_found",
        message: "Cart not found"
      })
    }

    if (!cart.payment_collection) {
      return res.status(400).json({
        type: "invalid_data",
        message: "Cart does not have a payment collection"
      })
    }

    // Create payment session for the payment collection
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    
    const paymentSession = await paymentModuleService.createPaymentSession(
      cart.payment_collection.id,
      {
        provider_id,
        currency_code: cart.payment_collection.currency_code,
        amount: cart.payment_collection.amount,
        data
      }
    )

    res.status(200).json({
      cart: {
        ...cart,
        payment_collection: {
          ...cart.payment_collection,
          payment_sessions: [paymentSession]
        }
      }
    })
  } catch (error) {
    console.error("Error creating payment session:", error)
    res.status(500).json({
      type: "unknown_error",
      message: "An unknown error occurred."
    })
  }
}
