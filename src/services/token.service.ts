import axios from 'axios'
import { WECHAT_CONFIG } from '../config/wechat'
import { TicketService } from './ticket.service'
import { redis } from '../config/redis'

export class TokenService {
  private static redisKey = `wechat:component_access_token:${WECHAT_CONFIG.appId}`
  private static componentAccessToken: string | null = null
  private static expiresAt = 0

  static async getComponentAccessToken(): Promise<string> {
    // 1. 优先使用内存缓存
    if (this.isTokenValid()) {
      return this.componentAccessToken!
    }

    // 2. Redis 缓存
    const cached = await redis.get(this.redisKey)
    if (cached) {
      // 注意：Redis 无法提供 expiresAt，我们只能假设有效
      this.componentAccessToken = cached
      this.expiresAt = Date.now() + 110 * 60 * 1000 // 假设 Redis 设置了 2 小时有效期，我们保守估计只用 110 分钟
      return cached
    }

    // 3. 拉取新 token
    return await this.refreshComponentAccessToken()
  }

  private static async refreshComponentAccessToken(): Promise<string> {
    const ticket = await TicketService.getTicket()
    if (!ticket) {
      throw new Error('没有可用的 component_verify_ticket')
    }

    const res = await axios.post(
      `${WECHAT_CONFIG.apiBaseUrl}/component/api_component_token`,
      {
        component_appid: WECHAT_CONFIG.appId,
        component_appsecret: WECHAT_CONFIG.appSecret,
        component_verify_ticket: ticket,
      }
    )

    const { component_access_token, expires_in } = res.data
    // 校验 expires_in 是否为有效数字
    const ttl = parseInt(String(expires_in), 10)
    if (isNaN(ttl) || ttl <= 300) {
      console.error('Invalid expires_in value from WeChat API:', res.data)
      throw new Error(`Invalid expires_in value: ${expires_in}`)
    }

    // 更新 Redis
    await redis.set(
      this.redisKey,
      component_access_token,
      'EX',
      expires_in - 300
    )

    // 同步更新内存
    this.componentAccessToken = component_access_token
    this.expiresAt = Date.now() + (expires_in - 300) * 1000

    console.log('已刷新并保存到 Redis 的 component_access_token')
    return component_access_token
  }

  private static isTokenValid(): boolean {
    return !!this.componentAccessToken && this.expiresAt > Date.now()
  }
}
