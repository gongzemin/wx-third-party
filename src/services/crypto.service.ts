import crypto from 'crypto'
import { WECHAT_CONFIG } from '../config/wechat'

export class CryptoService {
  // 生成签名
  static generateSignature(
    timestamp: string,
    nonce: string,
    encrypt?: string
  ): string {
    const arr = [WECHAT_CONFIG.token, timestamp, nonce]
    if (encrypt) arr.push(encrypt)
    arr.sort()
    return crypto.createHash('sha1').update(arr.join('')).digest('hex')
  }

  // 解密微信加密消息
  static decryptMessage(encryptedMsg: string): string {
    const encodingAESKey = WECHAT_CONFIG.encodingAesKey // 43 字符 Base64
    const aesKey = Buffer.from(encodingAESKey + '=', 'base64') // 解码为 32 字节
    const iv = aesKey.subarray(0, 16) // 前16字节作为 IV

    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv)
    decipher.setAutoPadding(false) // 微信使用自定义 padding

    let decrypted = Buffer.concat([
      decipher.update(encryptedMsg, 'base64'),
      decipher.final(),
    ])

    // 去除 padding
    decrypted = CryptoService.removePKCS7Padding(decrypted)

    // 取出 XML 内容
    const contentLength = decrypted.readUInt32BE(16)
    const xmlContent = decrypted.slice(20, 20 + contentLength).toString()

    return xmlContent
  }

  // 微信使用 PKCS#7 填充，需要手动去除
  private static removePKCS7Padding(buffer: Buffer): Buffer {
    const pad = buffer[buffer.length - 1]
    if (pad < 1 || pad > 32) {
      return buffer // 非法填充，返回原始数据
    }
    return buffer.slice(0, buffer.length - pad)
  }
}
