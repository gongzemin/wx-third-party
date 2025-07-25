import { Request, Response, NextFunction } from 'express'
import { CryptoService } from '../services/crypto.service'
import { TicketService } from '../services/ticket.service'
import { TokenService } from '../services/token.service'
import { xmlToJson } from '../utils/xml.util'

export class EventController {
  // 处理微信服务器验证
  static async handleServerVerify(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { signature, timestamp, nonce, echostr } = req.query

      // 验证签名
      const isValid =
        CryptoService.generateSignature(
          timestamp as string,
          nonce as string
        ) === signature

      if (isValid) {
        res.send(echostr)
      } else {
        res.status(403).send('Invalid signature')
      }
    } catch (error) {
      next(error)
    }
  }

  // 处理微信事件
  static async handleEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { signature, timestamp, nonce, msg_signature } = req.query
      const xmlData = req.body // 假设已通过中间件解析
      console.log('原始 body:', req.body)

      // 验证签名
      const encryptedMsg = xmlData.xml.Encrypt
      const isValid =
        CryptoService.generateSignature(
          timestamp as string,
          nonce as string,
          encryptedMsg
        ) === msg_signature

      if (!isValid) {
        return res.status(403).send('Invalid signature')
      }

      // 解密消息
      const decryptedMsg = CryptoService.decryptMessage(encryptedMsg)
      const event = await xmlToJson(decryptedMsg)
      const infoType = event.xml.InfoType

      // 处理不同类型的事件
      switch (infoType) {
        case 'component_verify_ticket':
          const ticket = event.xml.ComponentVerifyTicket
          TicketService.updateTicket(ticket)
          // 自动刷新 token
          await TokenService.getComponentAccessToken()
          break

        case 'authorized':
          // 处理授权成功事件
          break

        case 'unauthorized':
          // 处理取消授权事件
          break
      }

      res.send('success')
    } catch (error) {
      next(error)
    }
  }
}
