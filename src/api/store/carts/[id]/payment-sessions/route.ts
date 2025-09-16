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
      entryPoint: "cart",
      fields: ["id", "payment_collection.*"],
      filters: { id }
    })

    const cart = carts?.[0]
    console.log("Found cart:", cart ? "yes" : "no", cart?.payment_collection ? "with payment collection" : "without payment collection")

    if (!cart) {
      return res.status(404).json({
        type: "not_found",
        message: "Cart not found"
      })
    }

    // Get or create payment collection for the cart
    let paymentCollection = cart.payment_collection
    
    if (!paymentCollection) {
      console.log("Cart has no payment collection, creating one...")
      
      // Get cart total and currency
      const cartTotal = cart.total || 0
      const cartCurrency = cart.currency_code || "usd"
      
      const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
      console.log("Payment module service resolved:", !!paymentModuleService)
      
      // Create payment collection for the cart
      paymentCollection = await paymentModuleService.createPaymentCollection({
        cart_id: cart.id,
        amount: cartTotal,
        currency_code: cartCurrency,
        region_id: cart.region_id
      })
      
      console.log("Created payment collection:", paymentCollection.id)
    }

    // Create payment session for the payment collection
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    console.log("Payment module service resolved:", !!paymentModuleService)
    
    const paymentSessionData = {
      provider_id,
      currency_code: paymentCollection.currency_code,
      amount: paymentCollection.amount,
      data
    }
    console.log("Creating payment session with data:", paymentSessionData)
    
    const paymentSession = await paymentModuleService.createPaymentSession(
      paymentCollection.id,
      paymentSessionData
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
