import { Request, Response } from "express"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

export const POST = async (req: Request & { scope: any }, res: Response) => {
  const { id } = req.params
  let { provider_id = "stripe", data = {} } = req.body
  

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
      // Create payment collection first using the working endpoint logic
      console.log("Creating payment collection for cart...")
      
      // Use internal service to create payment collection
      const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
      
      if (!paymentModuleService) {
        return res.status(500).json({
          type: "service_error",
          message: "Payment service not available"
        })
      }

      const createdCollections = await paymentModuleService.createPaymentCollections([{
        cart_id: cart.id,
        amount: cart.total || 0,
        currency_code: cart.currency_code || "eur",
        region_id: cart.region_id
      }])
      
      paymentCollection = createdCollections[0]
      console.log("Created payment collection:", paymentCollection.id)
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

    // Create payment session by making internal request to payment-collections endpoint
    console.log("Creating payment session for collection:", paymentCollection.id)
    
    try {
      // Use the working payment-collections endpoint internally
      const paymentCollectionService = req.scope.resolve(Modules.PAYMENT)
      
      if (!paymentCollectionService) {
        throw new Error("Payment module service not available")
      }

      // Create payment session using the same logic as /store/payment-collections/:id/payment-sessions
      const paymentSession = await paymentCollectionService.createPaymentSession(
        paymentCollection.id,
        {
          provider_id,
          currency_code: paymentCollection.currency_code,
          amount: paymentCollection.amount,
          data
        }
      )

      console.log("Payment session created successfully:", !!paymentSession)

      res.status(200).json({
        cart: {
          ...cart,
          payment_collection: {
            ...paymentCollection,
            payment_sessions: [paymentSession]
          }
        }
      })
    } catch (sessionError) {
      console.error("Failed to create payment session:", sessionError)
      
      // Return payment collection without session if Stripe fails
      // Frontend can handle this and show appropriate error
      res.status(200).json({
        cart: {
          ...cart,
          payment_collection: {
            ...paymentCollection,
            payment_sessions: []
          }
        }
      })
    }
  } catch (error) {
    console.error("Error in cart payment-session:", error)
    console.error("Error stack:", error.stack)
    res.status(500).json({
      type: "unknown_error",
      message: error.message || "An unknown error occurred."
    })
  }
}
