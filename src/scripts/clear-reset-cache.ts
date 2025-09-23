import { loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

async function clearResetPasswordCache() {
  try {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (restUrl && restToken) {
      console.log("Clearing reset password cache via Upstash REST API...")
      
      // Patterns de clés à supprimer
      const patterns = [
        "auth:reset:*",
        "reset:*", 
        "*reset*",
        "auth:*:reset:*",
        "emailpass:*"
      ]
      
      for (const pattern of patterns) {
        try {
          const response = await fetch(`${restUrl}/keys/${pattern}`, {
            headers: {
              'Authorization': `Bearer ${restToken}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            const keys = data.result || []
            console.log(`Found ${keys.length} keys for pattern ${pattern}:`, keys)
            
            // Supprimer chaque clé
            for (const key of keys) {
              const delResponse = await fetch(`${restUrl}/del/${key}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${restToken}`
                }
              })
              if (delResponse.ok) {
                console.log(`✅ Deleted cache key: ${key}`)
              }
            }
          }
        } catch (err) {
          console.log(`Pattern ${pattern} not found or error:`, err.message)
        }
      }
      
      // Flush complet du cache (optionnel - décommentez si nécessaire)
      // console.log("Flushing entire Redis cache...")
      // await fetch(`${restUrl}/flushall`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${restToken}` }
      // })
    }
    
    console.log("✅ Reset password cache cleared successfully!")
  } catch (error) {
    console.error("❌ Error clearing reset password cache:", error)
  }
}

clearResetPasswordCache()
