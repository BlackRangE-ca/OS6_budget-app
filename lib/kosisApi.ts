// 통계청 KOSIS API - 가계금융복지조사 연령대별 금융자산 현황
// API 키 발급: https://kosis.kr/openapi/index/index.jsp

const KOSIS_KEY = process.env.EXPO_PUBLIC_KOSIS_KEY

export type AgeGroupAsset = {
  ageGroup: string       // 연령대 (20대, 30대 등)
  totalAsset: number     // 평균 금융자산 (만원)
  deposit: number        // 예·적금 비율 (%)
  stock: number          // 주식·펀드 비율 (%)
  insurance: number      // 보험 비율 (%)
  other: number          // 기타 비율 (%)
}

export type PeerComparison = {
  myAgeGroup: string
  avgAsset: number
  avgDeposit: number
  avgStock: number
  avgInsurance: number
  popularProducts: string[]
  advice: string
}

// 통계청 가계금융복지조사 - 연령대별 금융자산 구성비
// orgId: 101 (통계청), tblId: DT_1HDLEF01
export async function fetchAgeGroupAssets(): Promise<AgeGroupAsset[]> {
  if (!KOSIS_KEY) {
    return getFallbackAgeGroupData()
  }

  try {
    const url =
      `https://kosis.kr/openapi/Param/statisticsParamData.do` +
      `?method=getList` +
      `&apiKey=${KOSIS_KEY}` +
      `&orgId=101` +
      `&tblId=DT_1HDLEF01` +
      `&itmId=ALL` +
      `&objL1=ALL` +
      `&format=json` +
      `&jsonVD=Y` +
      `&prdSe=Y` +
      `&startPrdDe=2023` +
      `&endPrdDe=2023`

    const response = await fetch(url)
    const data = await response.json()

    if (!data || data.err) {
      return getFallbackAgeGroupData()
    }

    return parseKosisData(data)
  } catch {
    return getFallbackAgeGroupData()
  }
}

function parseKosisData(data: any[]): AgeGroupAsset[] {
  const ageGroups = ['20대', '30대', '40대', '50대', '60대 이상']
  const result: AgeGroupAsset[] = []

  for (const age of ageGroups) {
    const rows = data.filter((r: any) => r.classNm?.includes(age))
    if (rows.length === 0) continue

    const get = (itemNm: string) =>
      Number(rows.find((r: any) => r.itmNm?.includes(itemNm))?.DT ?? 0)

    const deposit = get('예·적금')
    const stock = get('주식')
    const insurance = get('보험')
    const total = deposit + stock + insurance

    result.push({
      ageGroup: age,
      totalAsset: get('금융자산'),
      deposit: total > 0 ? Math.round(deposit / total * 100) : 0,
      stock: total > 0 ? Math.round(stock / total * 100) : 0,
      insurance: total > 0 ? Math.round(insurance / total * 100) : 0,
      other: total > 0 ? Math.max(0, 100 - Math.round(deposit / total * 100) - Math.round(stock / total * 100) - Math.round(insurance / total * 100)) : 0,
    })
  }

  return result.length > 0 ? result : getFallbackAgeGroupData()
}

// API 미연동 시 통계청 2023년 가계금융복지조사 기준 기본값
function getFallbackAgeGroupData(): AgeGroupAsset[] {
  return [
    { ageGroup: '20대', totalAsset: 2184, deposit: 68, stock: 18, insurance: 10, other: 4 },
    { ageGroup: '30대', totalAsset: 5320, deposit: 55, stock: 24, insurance: 15, other: 6 },
    { ageGroup: '40대', totalAsset: 9870, deposit: 48, stock: 26, insurance: 18, other: 8 },
    { ageGroup: '50대', totalAsset: 13450, deposit: 50, stock: 22, insurance: 20, other: 8 },
    { ageGroup: '60대 이상', totalAsset: 11200, deposit: 58, stock: 15, insurance: 19, other: 8 },
  ]
}

// 사용자 나이에 맞는 또래 비교 데이터 + 맞춤 조언 생성
export function getPeerComparison(
  userAge: number,
  userAsset: number,         // 사용자 총 금융자산 (만원)
  userSavingsRatio: number,  // 사용자 저축 비율 (0~1)
): PeerComparison {
  const allData = getFallbackAgeGroupData()

  let myGroup: AgeGroupAsset
  if (userAge < 30) myGroup = allData[0]
  else if (userAge < 40) myGroup = allData[1]
  else if (userAge < 50) myGroup = allData[2]
  else if (userAge < 60) myGroup = allData[3]
  else myGroup = allData[4]

  const assetDiff = userAsset - myGroup.totalAsset
  const popularProducts: string[] = []

  if (myGroup.deposit >= 50) popularProducts.push('예·적금 (또래 평균 1순위)')
  if (myGroup.stock >= 20) popularProducts.push('주식·ETF (또래 평균 2순위)')
  if (myGroup.insurance >= 15) popularProducts.push('보험·연금 (또래 평균 3순위)')

  let advice = ''
  if (assetDiff < -1000) {
    advice = `또래 평균보다 약 ${Math.abs(assetDiff).toLocaleString()}만원 적어요. 예·적금 자동이체로 저축 습관을 먼저 만들어보세요.`
  } else if (assetDiff < 0) {
    advice = `또래 평균과 비슷한 수준이에요. 적금 외에 ETF 소액 투자도 고려해볼 만해요.`
  } else {
    advice = `또래 평균보다 약 ${assetDiff.toLocaleString()}만원 많아요. 분산 투자로 자산을 더 키워보세요.`
  }

  return {
    myAgeGroup: myGroup.ageGroup,
    avgAsset: myGroup.totalAsset,
    avgDeposit: myGroup.deposit,
    avgStock: myGroup.stock,
    avgInsurance: myGroup.insurance,
    popularProducts,
    advice,
  }
}
