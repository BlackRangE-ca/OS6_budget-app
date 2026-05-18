// 통계청 KOSIS API - 가계금융복지조사 연령대별 금융자산 현황
// API 키 발급: https://kosis.kr/openapi/index/index.jsp

const KOSIS_KEY = process.env.EXPO_PUBLIC_KOSIS_KEY

export type AgeGroupAsset = {
  ageGroup: string
  gender: 'male' | 'female' | 'all'
  totalAsset: number   // 평균 금융자산 (만원)
  deposit: number      // 예·적금 비율 (%)
  stock: number        // 주식·펀드 비율 (%)
  insurance: number    // 보험 비율 (%)
  other: number        // 기타 비율 (%)
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

// 사회초년생 기준 연령대
export const AGE_GROUPS = ['22~25세', '26~29세', '30~34세', '35세 이상']
export const AGE_LABELS: Record<string, string> = {
  '22~25세': '사회초년생 1~3년차',
  '26~29세': '직장 4~7년차',
  '30~34세': '30대 초반',
  '35세 이상': '35세 이상',
}

// 통계청 2023 가계금융복지조사 기반 추정값 (성별·연령대별)
function getFallbackData(gender: 'male' | 'female'): AgeGroupAsset[] {
  if (gender === 'male') {
    return [
      { ageGroup: '22~25세', gender: 'male', totalAsset: 1850, deposit: 60, stock: 24, insurance: 12, other: 4 },
      { ageGroup: '26~29세', gender: 'male', totalAsset: 3400, deposit: 53, stock: 30, insurance: 13, other: 4 },
      { ageGroup: '30~34세', gender: 'male', totalAsset: 6200, deposit: 48, stock: 32, insurance: 15, other: 5 },
      { ageGroup: '35세 이상', gender: 'male', totalAsset: 9800, deposit: 45, stock: 30, insurance: 18, other: 7 },
    ]
  }
  return [
    { ageGroup: '22~25세', gender: 'female', totalAsset: 1620, deposit: 70, stock: 14, insurance: 12, other: 4 },
    { ageGroup: '26~29세', gender: 'female', totalAsset: 2950, deposit: 63, stock: 19, insurance: 14, other: 4 },
    { ageGroup: '30~34세', gender: 'female', totalAsset: 5400, deposit: 57, stock: 23, insurance: 16, other: 4 },
    { ageGroup: '35세 이상', gender: 'female', totalAsset: 7600, deposit: 54, stock: 21, insurance: 20, other: 5 },
  ]
}

export async function fetchAgeGroupAssets(gender: 'male' | 'female' = 'male'): Promise<{ data: AgeGroupAsset[]; isFallback: boolean }> {
  if (!KOSIS_KEY) return { data: getFallbackData(gender), isFallback: true }

  try {
    const genderCode = gender === 'male' ? '1' : '2'
    const url =
      `https://kosis.kr/openapi/Param/statisticsParamData.do` +
      `?method=getList` +
      `&apiKey=${KOSIS_KEY}` +
      `&orgId=101` +
      `&tblId=DT_1HDLEF01` +
      `&itmId=ALL` +
      `&objL1=ALL` +
      `&objL2=${genderCode}` +
      `&format=json` +
      `&jsonVD=Y` +
      `&prdSe=Y` +
      `&startPrdDe=2023` +
      `&endPrdDe=2023`

    const response = await fetch(url)
    const data = await response.json()

    if (!data || data.err || !Array.isArray(data)) return { data: getFallbackData(gender), isFallback: true }

    const parsed = parseKosisData(data, gender)
    return parsed.length > 0 ? { data: parsed, isFallback: false } : { data: getFallbackData(gender), isFallback: true }
  } catch {
    return { data: getFallbackData(gender), isFallback: true }
  }
}

function parseKosisData(data: any[], gender: 'male' | 'female'): AgeGroupAsset[] {
  const ageGroups = ['22~25세', '26~29세', '30~34세', '35세 이상']
  const kosisKeywords: Record<string, string[]> = {
    '22~25세': ['20대 초반', '22~24', '25~29'],
    '26~29세': ['20대 후반', '25~29', '26~29'],
    '30~34세': ['30대 초반', '30~34'],
    '35세 이상': ['35~39', '40대', '50대'],
  }

  const result: AgeGroupAsset[] = []
  for (const age of ageGroups) {
    const keywords = kosisKeywords[age]
    const rows = data.filter((r: any) =>
      keywords.some(k => r.classNm?.includes(k))
    )
    if (rows.length === 0) continue

    const get = (itemNm: string) =>
      Number(rows.find((r: any) => r.itmNm?.includes(itemNm))?.DT ?? 0)

    const deposit = get('예·적금')
    const stock = get('주식')
    const insurance = get('보험')
    const total = deposit + stock + insurance
    if (total === 0) continue

    result.push({
      ageGroup: age,
      gender,
      totalAsset: get('금융자산'),
      deposit: Math.round(deposit / total * 100),
      stock: Math.round(stock / total * 100),
      insurance: Math.round(insurance / total * 100),
      other: Math.max(0, 100 - Math.round(deposit / total * 100) - Math.round(stock / total * 100) - Math.round(insurance / total * 100)),
    })
  }
  return result
}

export function getPeerComparison(
  ageGroupIndex: number,
  gender: 'male' | 'female',
  userAsset: number,
  userSavingsRatio: number,
): PeerComparison {
  const data = getFallbackData(gender)
  const myGroup = data[Math.min(ageGroupIndex, data.length - 1)]

  const assetDiff = userAsset - myGroup.totalAsset
  const popularProducts: string[] = []

  if (myGroup.deposit >= 50) popularProducts.push('예·적금 (또래 1순위)')
  if (myGroup.stock >= 20) popularProducts.push('주식·ETF (또래 2순위)')
  if (myGroup.insurance >= 14) popularProducts.push('보험·연금 (또래 3순위)')

  let advice = ''
  if (assetDiff < -1000) {
    advice = `또래 ${gender === 'male' ? '남성' : '여성'} 평균보다 약 ${Math.abs(assetDiff).toLocaleString()}만원 적어요. 자동이체 저축으로 습관부터 만들어보세요.`
  } else if (assetDiff < 0) {
    advice = `또래 평균과 비슷한 수준이에요. 예적금 외에 ETF 소액 투자도 고려해볼 만해요.`
  } else {
    advice = `또래 ${gender === 'male' ? '남성' : '여성'} 평균보다 약 ${assetDiff.toLocaleString()}만원 많아요. 분산 투자로 자산을 더 키워보세요.`
  }

  if (userSavingsRatio > 0 && userSavingsRatio < 0.1) {
    advice += ' 저축률이 10% 미만이에요. 먼저 저축 비율을 올리는 게 우선이에요.'
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
