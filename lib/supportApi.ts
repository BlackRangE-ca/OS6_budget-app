export type ApiSupportProgram = {
  id: string
  title: string
  category: string
  target: string
  summary: string
  condition: string
  benefit: string
  link: string
}

const SERVICE_KEY = process.env.EXPO_PUBLIC_PUBLIC_DATA_KEY

const API_URL =
  'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001'

function getXmlValue(xml: string, tagName: string) {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's')
  const match = xml.match(regex)

  return match
    ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    : ''
}

function getXmlItems(xml: string) {
  const itemRegex = /<servList>(.*?)<\/servList>/gs
  return [...xml.matchAll(itemRegex)].map((match) => match[1])
}

export async function fetchSupportPrograms(): Promise<ApiSupportProgram[]> {
  if (!SERVICE_KEY) {
    throw new Error('공공데이터포털 서비스키가 없습니다.')
  }

  const url =
    `${API_URL}` +
    `?serviceKey=${SERVICE_KEY}` +
    `&callTp=L` +
    `&pageNo=1` +
    `&numOfRows=30` +
    `&srchKeyCode=003` +
    `&searchWrd=${encodeURIComponent('청년')}`

  const response = await fetch(url)
  const xmlText = await response.text()

  console.log('지원금 API 전체 응답:', xmlText)

  if (xmlText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
    throw new Error('서비스키가 해당 API에 등록되지 않았습니다.')
  }

  if (xmlText.includes('SERVICE_ACCESS_DENIED_ERROR')) {
    throw new Error('해당 API 활용신청 승인이 필요합니다.')
  }

  if (xmlText.includes('Unexpected errors')) {
    throw new Error('API 요청 파라미터 또는 엔드포인트 오류입니다.')
  }

  const items = getXmlItems(xmlText)

  return items.map((item, index) => {
    const id = getXmlValue(item, 'servId') || String(index + 1)
    const title = getXmlValue(item, 'servNm') || '청년 지원 정책'
    const summary = getXmlValue(item, 'servDgst') || '상세 내용 확인 필요'
    const target =
      getXmlValue(item, 'trgterIndvdlArray') ||
      getXmlValue(item, 'lifeArray') ||
      '지원 대상 확인 필요'

    return {
      id,
      title,
      category: '청년 지원',
      target,
      summary,
      condition: '상세조회에서 확인 필요',
      benefit: summary,
      link: 'https://www.bokjiro.go.kr',
    }
  })
}