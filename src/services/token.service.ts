import axios from 'axios'
import { WECHAT_CONFIG } from '../config/wechat'
import { TicketService } from './ticket.service'

export class TokenService {
  private static componentAccessToken: string = ''
  private static expiresAt: number = 0

  // 获取 component_access_token
  static async getComponentAccessToken() {
    // 检查是否有有效 token
    if (this.isTokenValid()) {
      return this.componentAccessToken
    }

    // 刷新 token
    return await this.refreshComponentAccessToken()
  }

  // 刷新 token
  private static async refreshComponentAccessToken() {
    const ticket = TicketService.getTicket()
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
    this.componentAccessToken = component_access_token
    this.expiresAt = Date.now() + (expires_in - 300) * 1000 // 提前 5 分钟过期

    console.log('已刷新 component_access_token')
    return component_access_token
  }

  // 检查 token 是否有效
  private static isTokenValid() {
    return this.componentAccessToken && this.expiresAt > Date.now()
  }
}
