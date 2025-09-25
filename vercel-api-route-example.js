// FICHIER À CRÉER SUR VERCEL : /pages/api/reset-password.js
// OU /app/api/reset-password/route.js (App Router)

// Pages Router (/pages/api/reset-password.js)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, token, password } = req.body;

  if (!email || !token || !password) {
    return res.status(400).json({ 
      message: 'Email, token, and password are required' 
    });
  }

  try {
    // IMPORTANT: Token dans le header Authorization Bearer (Medusa v2.6+)
    const response = await fetch('https://medusabackend-production-e0e9.up.railway.app/auth/customer/emailpass/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // ← TOKEN DANS LE HEADER !
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({ 
        success: true, 
        message: 'Password reset successfully',
        data 
      });
    } else {
      const errorData = await response.json();
      console.error('Medusa API Error:', errorData);
      return res.status(response.status).json(errorData);
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

// App Router (/app/api/reset-password/route.js)
export async function POST(request) {
  const { email, token, password } = await request.json();

  if (!email || !token || !password) {
    return Response.json({ 
      message: 'Email, token, and password are required' 
    }, { status: 400 });
  }

  try {
    // IMPORTANT: Token dans le header Authorization Bearer (Medusa v2.6+)
    const response = await fetch('https://medusabackend-production-e0e9.up.railway.app/auth/customer/emailpass/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // ← TOKEN DANS LE HEADER !
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json({ 
        success: true, 
        message: 'Password reset successfully',
        data 
      });
    } else {
      const errorData = await response.json();
      console.error('Medusa API Error:', errorData);
      return Response.json(errorData, { status: response.status });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return Response.json({ 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}
