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
      const url = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${componentAppId}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}`
      console.log('授权跳转url：', url)
      // 简单的 HTML 页面，用户点击后跳转到微信授权页面
      res.send(`
      <html>
        <head>
          <title>请授权给我们的平台</title>
        </head>
        <body>
          <h3>欢迎使用我们的服务</h3>
          <p>请点击下方按钮授权，以便我们为您提供更全面的服务</p>
          <button onclick="window.location.href='${url}'">
            点击授权
          </button>
        </body>
      </html>
      `)
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
