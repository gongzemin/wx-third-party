import CryptoJS from 'crypto-js'
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
    return CryptoJS.SHA1(arr.join('')).toString()
  }

  // 消息解密（简化版，实际需使用 AES-256-CBC）
  static decryptMessage(encryptedMsg: string): string {
    // 此处应实现完整的 AES 解密逻辑
    // 示例代码仅作演示，非完整实现
    return encryptedMsg
  }
}
