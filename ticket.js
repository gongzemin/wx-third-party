const express = require('express')
const bodyParser = require('body-parser')
const xml2js = require('xml2js')
const fs = require('fs')

const app = express()
const port = 3000

// 中间件：解析 XML 请求体
app.use(bodyParser.text({ type: 'application/xml' }))

// 接收微信推送的 component_verify_ticket
app.post('/wechat/callback', (req, res) => {
  const xmlData = req.body

  // 解析 XML
  xml2js.parseString(xmlData, { explicitArray: false }, (err, result) => {
    if (err) {
      return res.status(400).send('Invalid XML')
    }

    const msg = result.xml
    if (msg.InfoType === 'component_verify_ticket') {
      const ticket = msg.ComponentVerifyTicket
      const createTime = msg.CreateTime
      console.log(
        `Received component_verify_ticket: ${ticket} at ${createTime}`
      )

      // 保存 ticket 到文件（示例，实际可使用数据库）
      fs.writeFileSync('component_verify_ticket.txt', ticket)
    }

    // 响应微信服务器
    res.send('success')
  })
})

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
