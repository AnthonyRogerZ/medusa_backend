import { Request, Response } from "express"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

export const POST = async (req: Request & { scope: any }, res: Response) => {
  const { id } = req.params
  const { provider_id = "stripe", data = {} } = req.body

  try {
    console.log("Creating payment session for cart:", id, "with provider:", provider_id)
    
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    
    // Get cart
    const carts = await remoteQuery({
      entryPoint: "cart",
      fields: ["id", "total", "currency_code", "region_id"],
      filters: { id }
    })

    const cart = carts?.[0]
    console.log("Found cart:", cart ? "yes" : "no")

    if (!cart) {
      return res.status(404).json({
        type: "not_found",
        message: "Cart not found"
      })
    }

    // Check if payment collection exists for this cart
    const paymentCollections = await remoteQuery({
      entryPoint: "payment_collection",
      fields: ["id", "amount", "currency_code", "payment_sessions.*"],
      filters: { cart_id: id }
    })

    let paymentCollection = paymentCollections?.[0]
    console.log("Found payment collection:", paymentCollection ? "yes" : "no")

    if (!paymentCollection) {
      console.log("No payment collection found, redirecting to create one first...")
      return res.status(400).json({
        type: "invalid_data",
        message: "Payment collection must be created first. Please call POST /store/payment-collections with cart_id."
      })
    }

    // Check if payment session already exists for this provider
    const existingSession = paymentCollection.payment_sessions?.find(
      (session: any) => session.provider_id === provider_id
    )

    if (existingSession) {
      console.log("Payment session already exists for provider:", provider_id)
      return res.status(200).json({
        cart: {
          ...cart,
          payment_collection: {
            ...paymentCollection,
            payment_sessions: [existingSession]
          }
        }
      })
    }

    // Create payment session using the existing payment collection endpoint logic
    // This mimics what the /store/payment-collections/:id/payment-sessions endpoint would do
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    
    if (!paymentModuleService) {
      throw new Error("Payment module service not found")
    }

    const paymentSession = await paymentModuleService.createPaymentSession(
      paymentCollection.id,
      {
        provider_id,
        currency_code: paymentCollection.currency_code,
        amount: paymentCollection.amount,
        data
      }
    )

    console.log("Payment session created:", !!paymentSession)

    res.status(200).json({
      cart: {
        ...cart,
        payment_collection: {
          ...paymentCollection,
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
