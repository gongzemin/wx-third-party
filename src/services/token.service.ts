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

  static async getPreAuthCode(): Promise<string> {
    const token = await this.getComponentAccessToken()

    const res = await axios.post(
      `${WECHAT_CONFIG.apiBaseUrl}/component/api_create_preauthcode?component_access_token=${token}`,
      {
        component_appid: WECHAT_CONFIG.appId,
      }
    )

    const { pre_auth_code, expires_in, errcode, errmsg } = res.data
    console.log(
      '获取到新的 pre_auth_code:',
      pre_auth_code,
      'expires_in:',
      expires_in
    )

    if (errcode) {
      console.error('获取预授权码失败:', res.data)
      throw new Error(`微信 API 错误: ${errmsg}`)
    }

    if (!pre_auth_code || !expires_in) {
      throw new Error('微信返回的预授权码数据不完整')
    }

    console.log('获取到新的 pre_auth_code:', pre_auth_code)
    return pre_auth_code
  }

  /**
   * 用 auth_code 换取 authorizer_access_token
   */
  static async getAuthorizerAccessToken(authCode: string): Promise<any> {
    const accessToken = await this.getComponentAccessToken()

    const url = `${WECHAT_CONFIG.apiBaseUrl}/component/api_query_auth?component_access_token=${accessToken}`

    const response = await axios.post(url, {
      component_appid: process.env.WECHAT_COMPONENT_APPID,
      authorization_code: authCode,
    })

    const data = response.data
    console.log('获取到的授权信息:', data)

    if (data.errcode) {
      throw new Error(
        `获取 authorizer_access_token 失败: ${JSON.stringify(data)}`
      )
    }

    return data.authorization_info
  }

  // 生成扫码链接发起授权
  static async getAuthUrl(redirectUri: string): Promise<string> {
    const preAuthCode = await this.getPreAuthCode()
    return `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${
      WECHAT_CONFIG.appId
    }&pre_auth_code=${preAuthCode}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`
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
    console.log(
      '获取到新的 component_access_token:',
      component_access_token,
      'expires_in:',
      expires_in
    )
    // 校验 expires_in 是否为有效数字
    const ttl = parseInt(String(expires_in), 10)
    if (isNaN(ttl) || ttl <= 300) {
      console.error('微信 API 返回的 expires_in 值无效:', res.data)
      throw new Error(`无效的 expires_in 值: ${expires_in}`)
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
