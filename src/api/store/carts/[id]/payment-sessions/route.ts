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
      console.log("Creating payment collection for cart...")
      
      // Use the payment module service to create payment collection
      const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
      
      paymentCollection = await paymentModuleService.createPaymentCollections([{
        cart_id: cart.id,
        amount: cart.total || 0,
        currency_code: cart.currency_code || "usd",
        region_id: cart.region_id
      }])
      
      paymentCollection = paymentCollection[0]
      console.log("Created payment collection:", paymentCollection.id)
    }

    // Create payment session for the payment collection
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    
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
