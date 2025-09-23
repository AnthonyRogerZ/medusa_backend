import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

interface ResetPasswordBody {
  email: string;
  token: string;
  password: string;
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<MedusaResponse> {
  const { email, token, password } = req.body as ResetPasswordBody

  if (!email || !token || !password) {
    return res.status(400).json({
      type: "invalid_data",
      message: "Email, token, and password are required"
    })
  }

  try {
    // Faire un appel direct à l'API auth interne
    const response = await fetch(`${req.protocol}://${req.get('host')}/auth/customer/emailpass/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: email,
        token: token,
        password: password
      })
    })

    if (response.ok) {
      return res.status(200).json({ 
        success: true,
        message: "Password reset successfully" 
      })
    } else {
      const errorData = await response.json()
      return res.status(response.status).json(errorData)
    }
  } catch (error) {
    console.error("Password reset error:", error)
    
    return res.status(500).json({
      type: "server_error",
      message: "Failed to reset password"
    })
  }
}
