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
      console.log('Content-Type:', req.headers['content-type']) // 应该是 application/xml
      console.log('Raw Body:', req.body) // 打印原始请求体
      const { signature, timestamp, nonce, msg_signature } = req.query
      // 1. 解析 XML
      const parsedXml = await xmlToJson(req.body)
      console.log('解析后的 XML:', parsedXml)
      const encryptedMsg = parsedXml.xml.Encrypt
      if (!encryptedMsg) {
        return res.status(400).send('Missing Encrypt field')
      }
      console.log('加密消息:', encryptedMsg)
      console.log('查询参数:', req.query)

      // 2. 验证签名
      const signatureCheck = CryptoService.generateSignature(
        timestamp as string,
        nonce as string,
        encryptedMsg
      )
      if (signatureCheck !== msg_signature) {
        return res.status(403).send('Invalid signature')
      }
      console.log('签名验证通过', signatureCheck, msg_signature)

      // 3. 解密
      const decryptedXml = CryptoService.decryptMessage(encryptedMsg)
      const event = await xmlToJson(decryptedXml)
      const infoType = event.xml.InfoType
      console.log('解密后的事件:', event)

      console.log('事件类型:', infoType)
      // 处理不同类型的事件
      switch (infoType) {
        case 'component_verify_ticket':
          const ticket = event.xml.ComponentVerifyTicket
          TicketService.updateTicket(event.xml.AppId, ticket)
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
  // 支持多 appid 的事件处理（:appid/callback）
  static async handleAppCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { appid } = req.params
      const { signature, timestamp, nonce, msg_signature, encrypt_type } =
        req.query

      const xmlData = req.body

      const isValid =
        CryptoService.generateSignature(
          timestamp as string,
          nonce as string
        ) === signature

      if (!isValid) return res.status(401).send('Invalid signature')

      let decryptedMsg = xmlData

      if (encrypt_type === 'aes') {
        const parsed = await xmlToJson(xmlData)
        const encrypted = parsed.xml.Encrypt
        if (!encrypted) return res.status(400).send('Missing encrypted message')

        // 验证消息签名
        const check = CryptoService.generateSignature(
          timestamp as string,
          nonce as string,
          encrypted
        )
        if (check !== msg_signature) {
          return res.status(403).send('Invalid message signature')
        }

        decryptedMsg = CryptoService.decryptMessage(encrypted)
      }

      const result = await xmlToJson(decryptedMsg)
      const msg = result.xml

      console.log(`[${appid}] Received message:`, msg)

      res.send('success')
    } catch (error) {
      next(error)
    }
  }
}
