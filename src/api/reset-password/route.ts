import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { email, token, password } = req.body

  if (!email || !token || !password) {
    return res.status(400).json({
      type: "invalid_data",
      message: "Email, token, and password are required"
    })
  }

  try {
    const authModuleService = req.scope.resolve(ContainerRegistrationKeys.AUTH_MODULE)
    
    // Utiliser la méthode updateProvider pour changer le mot de passe avec le token
    await authModuleService.updateProvider({
      provider: "emailpass",
      identifier: email,
      token: token,
      password: password
    })

    res.status(200).json({ 
      success: true,
      message: "Password reset successfully" 
    })
  } catch (error) {
    console.error("Password reset error:", error)
    
    if (error.message?.includes("Invalid token") || error.message?.includes("token")) {
      return res.status(401).json({
        type: "unauthorized",
        message: "Invalid or expired token"
      })
    }
    
    res.status(500).json({
      type: "server_error",
      message: "Failed to reset password"
    })
  }
}
