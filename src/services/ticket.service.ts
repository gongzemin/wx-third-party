import { saveVerifyTicket } from '../config/redis'

export class TicketService {
  // 存储 ticket（实际项目中建议使用 Redis 或数据库）
  private static componentVerifyTicket: string = ''

  // 更新 ticket，同时保存到 Redis
  static async updateTicket(ticket: string, appId?: string) {
    this.componentVerifyTicket = ticket

    if (appId) {
      await saveVerifyTicket(appId, ticket)
      console.log(`ticket 已保存到 Redis，appId: ${appId}`)
    }
  }

  // 获取 ticket
  static getTicket() {
    return this.componentVerifyTicket
  }
}
