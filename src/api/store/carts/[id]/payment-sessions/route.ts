import { Request, Response } from "express"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

export const POST = async (req: Request & { scope: any }, res: Response) => {
  const { id } = req.params
  const { provider_id = "stripe", data = {} } = req.body

  try {
    console.log("Creating payment session for cart:", id, "with provider:", provider_id)
    
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    
    // Get cart with payment collection
    const carts = await remoteQuery({
      cart: {
        fields: ["id", "payment_collection.*"],
        filters: { id }
      }
    })

    const cart = carts?.[0]
    console.log("Found cart:", cart ? "yes" : "no", cart?.payment_collection ? "with payment collection" : "without payment collection")

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
    console.log("Payment module service resolved:", !!paymentModuleService)
    
    const paymentSessionData = {
      provider_id,
      currency_code: cart.payment_collection.currency_code,
      amount: cart.payment_collection.amount,
      data
    }
    console.log("Creating payment session with data:", paymentSessionData)
    
    const paymentSession = await paymentModuleService.createPaymentSession(
      cart.payment_collection.id,
      paymentSessionData
    )

    console.log("Payment session created:", !!paymentSession)

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
    console.error("Error stack:", error.stack)
    res.status(500).json({
      type: "unknown_error",
      message: error.message || "An unknown error occurred."
    })
  }
}
