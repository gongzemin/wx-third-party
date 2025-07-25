import axios from 'axios'
import { WECHAT_CONFIG } from '../config/wechat'

export class TicketService {
  // 存储 ticket（实际项目中建议使用 Redis 或数据库）
  private static componentVerifyTicket: string = ''

  // 更新 ticket
  static updateTicket(ticket: string) {
    this.componentVerifyTicket = ticket
    console.log('已更新 component_verify_ticket')
    // 可以添加持久化存储逻辑
  }

  // 获取 ticket
  static getTicket() {
    return this.componentVerifyTicket
  }
}
