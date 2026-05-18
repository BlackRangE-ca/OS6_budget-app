export type EconomyIndicator = {
  id: string
  title: string
  category: string
  target: string
  summary: string
  condition: string
  benefit: string
  link: string
}

const BOK_KEY = process.env.EXPO_PUBLIC_BOK_KEY

const API_URL = 'https://ecos.bok.or.kr/api/KeyStatisticList'

export async function fetchKeyStatistics(): Promise<EconomyIndicator[]> {
  if (!BOK_KEY) {
    throw new Error('한국은행 경제통계 API 인증키가 없습니다.')
  }

  const url = `${API_URL}/${BOK_KEY}/json/kr/1/10`

  const response = await fetch(url)
  const data = await response.json()

  console.log('한국은행 경제통계 API 응답:', data)

  const list = data?.KeyStatisticList?.row ?? []

  return list.slice(0, 10).map((item: any, index: number) => {
    const name = item.KEYSTAT_NAME ?? '경제지표'
    const value = item.DATA_VALUE ?? '-'
    const unit = item.UNIT_NAME ?? ''
    const cycle = item.CYCLE ?? ''
    const time = item.TIME ?? ''

    return {
      id: `economy-${index}`,
      title: name,
      category: '경제지표',
      target: `${time} 기준`,
      summary: `${name}은 현재 ${value}${unit}입니다.`,
      condition: `통계주기: ${cycle || '확인 필요'}`,
      benefit: '금리, 물가, 경기 흐름을 참고하여 자산관리 판단에 활용할 수 있습니다.',
      link: 'https://ecos.bok.or.kr',
    }
  })
}