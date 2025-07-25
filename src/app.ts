import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { EventController } from './controllers/event.controller'

const app = express()
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

app.post('/:appid/callback', EventController.handleAppCallback)

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err)
  res.status(500).send('Internal Server Error')
})

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`)
})
