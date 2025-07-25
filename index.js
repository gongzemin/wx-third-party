const express = require('express')
// const bodyParser = require('body-parser')
const xml2js = require('xml2js')
const crypto = require('crypto')
const axios = require('axios')
import xmlParser from 'express-xml-bodyparser'

const app = express()
const port = 3000

// 解析 application/xml 格式
app.use(xmlParser({ explicitArray: false }))
// // 中间件：解析 JSON 和 XML 请求体
// app.use(bodyParser.json())
// app.use(bodyParser.text({ type: 'application/xml' }))

// 微信服务器验证签名
function checkSignature(signature, timestamp, nonce, token) {
  const tmpArr = [token, timestamp, nonce].sort()
  const tmpStr = tmpArr.join('')
  const sha1 = crypto.createHash('sha1').update(tmpStr).digest('hex')
  return sha1 === signature
}

// 解密微信推送的加密消息
function decryptMsg(msgSignature, timestamp, nonce, encryptedMsg) {
  // 实现解密逻辑（参考微信文档，使用 AES-CBC 解密）
  // 这里需要使用 ENCODING_AES_KEY 和 APPID
  // 示例代码需根据实际需求实现
  return encryptedMsg // 简化处理，实际需解密
}

// 路由：处理微信服务器推送（授权事件、消息与事件）
app.post('/wechat/callback', async (req, res) => {
  const { signature, timestamp, nonce, encrypt_type, msg_signature } = req.query
  const xmlData = req.body

  // 验证签名
  if (!checkSignature(signature, timestamp, nonce, TOKEN)) {
    return res.status(401).send('Invalid signature')
  }

  // 如果是加密消息，需解密
  let decryptedMsg = xmlData
  if (encrypt_type === 'aes') {
    decryptedMsg = decryptMsg(msg_signature, timestamp, nonce, xmlData)
  }

  // 解析 XML
  xml2js.parseString(decryptedMsg, { explicitArray: false }, (err, result) => {
    if (err) {
      return res.status(400).send('Invalid XML')
    }

    const msg = result.xml
    console.log('Received message:', msg)

    // 处理不同类型的事件
    if (msg.InfoType === 'component_verify_ticket') {
      // 保存 ComponentVerifyTicket，用于获取 component_access_token
      console.log('ComponentVerifyTicket:', msg.ComponentVerifyTicket)
    } else if (msg.InfoType === 'authorized') {
      // 处理授权事件
      console.log('Authorization:', msg.AuthorizationCode)
    } else if (msg.InfoType === 'unauthorized') {
      // 处理取消授权事件
      console.log('Unauthorized:', msg.AuthorizerAppid)
    }

    // 响应微信服务器
    res.send('success')
  })
})

app.post('/:appid/callback', async (req, res) => {
  // 这里和 /wechat/callback 基本相同逻辑
  const appid = req.params.appid
  const { signature, timestamp, nonce, encrypt_type, msg_signature } = req.query
  const xmlData = req.body

  if (!checkSignature(signature, timestamp, nonce, TOKEN)) {
    return res.status(401).send('Invalid signature')
  }

  let decryptedMsg = xmlData
  if (encrypt_type === 'aes') {
    decryptedMsg = decryptMsg(msg_signature, timestamp, nonce, xmlData)
  }

  xml2js.parseString(decryptedMsg, { explicitArray: false }, (err, result) => {
    if (err) return res.status(400).send('Invalid XML')

    const msg = result.xml
    console.log(`[${appid}] Received message:`, msg)

    res.send('success')
  })
})

// 路由：授权发起页
app.get('/auth', (req, res) => {
  // 构造授权链接
  const authUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${APPID}&pre_auth_code=PRE_AUTH_CODE&redirect_uri=YOUR_REDIRECT_URI`
  res.redirect(authUrl)
})

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
