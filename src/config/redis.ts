import Redis from 'ioredis'
console.log('Redis URL:', process.env.REDIS_URL)

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not defined')
}

export const redis = new Redis(process.env.REDIS_URL || '')
export async function saveVerifyTicket(appId: string, ticket: string) {
  const key = `wechat:verify_ticket:${appId}`
  await redis.set(key, ticket, 'EX', 600) // 设置过期时间为 10 分钟
}

export async function getVerifyTicket(appId: string): Promise<string | null> {
  const key = `wechat:verify_ticket:${appId}`
  return await redis.get(key)
}
