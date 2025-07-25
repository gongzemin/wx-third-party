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

  /**
   * 解密微信消息
   * @param encryptedMsg 从 XML 中提取的 Encrypt 字段内容（Base64 编码）
   */
  static decryptMessage(encryptedMsg: string): string {
    const encodingAESKey = WECHAT_CONFIG.encodingAesKey
    console.log(`Using encodingAESKey: ${encodingAESKey}`)

    if (!encodingAESKey || encodingAESKey.length !== 43) {
      throw new Error(
        `Invalid encodingAESKey: must be 43 characters. Current length = ${encodingAESKey?.length}`
      )
    }

    // 解码 base64 得到 32 字节 aesKey
    let aesKey: Buffer
    try {
      aesKey = Buffer.from(encodingAESKey + '=', 'base64')
    } catch (e) {
      throw new Error(
        `Failed to decode encodingAESKey: ${(e as Error).message}`
      )
    }

    if (aesKey.length !== 32) {
      throw new Error(
        `Invalid aesKey length: expected 32 bytes, got ${aesKey.length}`
      )
    }

    const iv = aesKey.subarray(0, 16)

    let decrypted: Buffer
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv)
      decipher.setAutoPadding(false) // 微信自定义 padding

      decrypted = Buffer.concat([
        decipher.update(encryptedMsg, 'base64'),
        decipher.final(),
      ])
    } catch (e) {
      throw new Error(`Decryption failed: ${(e as Error).message}`)
    }

    decrypted = CryptoService.removePKCS7Padding(decrypted)

    // 前16字节是随机数，接下来的4字节是消息长度（大端）
    const contentLength = decrypted.readUInt32BE(16)

    if (20 + contentLength > decrypted.length) {
      throw new Error('Invalid decrypted message: content length out of bounds')
    }

    const xmlContent = decrypted.slice(20, 20 + contentLength).toString('utf-8')

    return xmlContent
  }

  /**
   * 去除 PKCS7 Padding（微信自定义填充方式）
   */
  static removePKCS7Padding(buffer: Buffer): Buffer {
    const pad = buffer[buffer.length - 1]
    if (pad < 1 || pad > 32) return buffer // 非法 padding，直接返回原始数据
    return buffer.subarray(0, buffer.length - pad)
  }
}
