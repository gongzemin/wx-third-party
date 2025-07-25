import { parseStringPromise } from 'xml2js'

// XML 转 JSON
export const xmlToJson = async (xml: string) => {
  return parseStringPromise(xml, { explicitArray: false })
}

// JSON 转 XML
export const jsonToXml = (json: any) => {
  let xml = '<xml>'
  Object.keys(json).forEach(key => {
    xml += `<${key}><![CDATA[${json[key]}]]></${key}>`
  })
  xml += '</xml>'
  return xml
}
