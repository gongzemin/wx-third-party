import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import path from 'path'
import { EventController } from './controllers/event.controller'
import { AuthController } from './controllers/auth.controller'

import dotenv from 'dotenv'
dotenv.config() // 一定要放最上面，提前加载环境变量
const app = express()
// 1. 配置模板引擎为 EJS
app.set('view engine', 'ejs')
// 2. 告诉 Express 模板文件的目录（相对于 src）
app.set('views', path.join(__dirname, 'views'))
const port = process.env.PORT || 3000

// 中间件
app.use(
  bodyParser.text({
    type: ['application/xml', 'text/xml'], // 微信的请求是 Content-Type: text/xml
  })
)

// 微信验证服务器有效性（GET）
app.get('/wechat/callback', EventController.handleServerVerify)

// 微信事件推送处理（POST）
app.post('/wechat/callback', EventController.handleEvent)

// 消息与事件接收配置
app.post('/:appid/callback', EventController.handleAppCallback)

// 授权发起页域名
app.get('/auth', AuthController.handleAuth)
// 微信授权完跳回你这
app.get('/auth/callback', AuthController.handleAuthCallback)

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err)
  res.status(500).send('Internal Server Error')
})

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`)
})
