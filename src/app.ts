import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { EventController } from './controllers/event.controller'

const app = express()
const port = process.env.PORT || 3000

// 中间件
app.use(bodyParser.text({ type: 'application/xml' }))

// 路由
app.get('/wechat/callback', EventController.handleServerVerify)
app.post('/wechat/callback', EventController.handleEvent)

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err)
  res.status(500).send('Internal Server Error')
})

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`)
})
