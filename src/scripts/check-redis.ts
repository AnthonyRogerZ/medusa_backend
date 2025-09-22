import { Redis } from '@upstash/redis/cloudflare'

async function checkRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('Les variables d\'environnement pour Redis ne sont pas configurées')
    return
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    await redis.set('test', 'connected')
    const value = await redis.get('test')
    console.log('Test Redis réussi. Valeur:', value)
  } catch (error) {
    console.error('Erreur de connexion à Redis:', error)
  }
}

checkRedis()
