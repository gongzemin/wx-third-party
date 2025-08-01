import { Request, Response, NextFunction } from 'express'
import { TokenService } from '../services/token.service'
export class AuthController {
  static async handleAuth(req: Request, res: Response) {
    try {
      const componentAppId = process.env.WECHAT_COMPONENT_APPID!
      const preAuthCode = await TokenService.getPreAuthCode() // 从微信获取
      console.log('获取到的 pre_auth_code:', preAuthCode)
      const redirectUri = encodeURIComponent(
        'https://wx-third-party.onrender.com/auth/callback'
      ) // 微信授权完跳回你这

      // 这个不是api.weixin.qq.com，而是mp.weixin.qq.com 是要跳转的

      const authUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${componentAppId}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}`

      // 渲染 EJS 模板，传递 authUrl 变量
      res.render('auth-guide', { authUrl })
      //   res.redirect(url)
    } catch (error) {
      console.error('授权跳转失败', error)
      res.status(500).send('授权跳转失败')
    }
  }

  static async handleAuthCallback(req: Request, res: Response) {
    const { auth_code, expires_in } = req.query

    if (!auth_code) {
      return res.status(400).send('缺少 auth_code')
    }

    try {
      // 用 auth_code 换取授权信息
      const result = await TokenService.getAuthorizerAccessToken(
        auth_code as string
      )

      console.log('授权成功，授权数据：', result)

      res.send('授权成功')
    } catch (err) {
      console.error('授权失败:', err)
      res.status(500).send('授权失败')
    }
  }
}
