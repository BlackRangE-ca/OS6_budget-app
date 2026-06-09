// 통계청 KOSIS API - 가구주연령계층별 자산·부채·소득 현황 (가계금융복지조사)
// 테이블: DT_1HDAAA06, orgId: 101

const KOSIS_KEY = process.env.EXPO_PUBLIC_KOSIS_KEY

export type AgeGroupAsset = {
  ageGroup: string
  gender: 'male' | 'female' | 'all'
  totalAsset: number   // 총자산 평균 (만원)
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

export const AGE_GROUPS = ['22~25세', '26~29세', '30~34세', '35세 이상']
export const AGE_LABELS: Record<string, string> = {
  '22~25세': '사회초년생 1~3년차',
  '26~29세': '직장 4~7년차',
  '30~34세': '30대 초반',
  '35세 이상': '35세 이상',
}

// 가계금융복지조사 기반 금융자산 구성비 추정값 (예·적금/주식·펀드/보험 비율)
// 총자산 대비가 아닌 금융자산 내 구성비
const ASSET_RATIOS: Record<string, { deposit: number; stock: number; insurance: number }> = {
  '22~25세': { deposit: 60, stock: 24, insurance: 12 },
  '26~29세': { deposit: 53, stock: 30, insurance: 13 },
  '30~34세': { deposit: 48, stock: 32, insurance: 15 },
  '35세 이상': { deposit: 45, stock: 30, insurance: 18 },
}

// 총자산 → 금융자산 환산 비율 (29세 이하 금융자산은 총자산의 약 35%)
const FINANCIAL_RATIO: Record<string, number> = {
  '22~25세': 0.38,
  '26~29세': 0.35,
  '30~34세': 0.28,
  '35세 이상': 0.25,
}

function buildFallback(gender: 'male' | 'female'): AgeGroupAsset[] {
  const base = gender === 'male'
    ? [1850, 3400, 6200, 9800]
    : [1620, 2950, 5400, 7600]

  return AGE_GROUPS.map((ag, i) => {
    const r = ASSET_RATIOS[ag]
    return {
      ageGroup: ag, gender,
      totalAsset: base[i],
      deposit: r.deposit, stock: r.stock, insurance: r.insurance,
      other: Math.max(0, 100 - r.deposit - r.stock - r.insurance),
    }
  })
}

// KOSIS C2 코드 → 앱 연령 그룹 매핑
const C2_MAP: Record<string, string[]> = {
  '22~25세': ['B1601'],          // 29세 이하
  '26~29세': ['B1601'],          // 29세 이하 (동일)
  '30~34세': ['B1602'],          // 30~39세
  '35세 이상': ['B1606', 'B1602'], // 39세 이하 우선, 없으면 30~39세
}

export async function fetchAgeGroupAssets(
  gender: 'male' | 'female' = 'male',
): Promise<{ data: AgeGroupAsset[]; isFallback: boolean; fallbackReason?: 'no_key' | 'error' }> {
  if (!KOSIS_KEY) return { data: buildFallback(gender), isFallback: true, fallbackReason: 'no_key' }

  try {
    const url =
      `https://kosis.kr/openapi/Param/statisticsParameterData.do` +
      `?method=getList` +
      `&apiKey=${KOSIS_KEY}` +
      `&orgId=101` +
      `&tblId=DT_1HDAAA06` +
      `&itmId=T01+` +
      `&objL1=A0100` +
      `&objL2=ALL` +
      `&objL3=C05+` +
      `&format=json` +
      `&jsonVD=Y` +
      `&prdSe=Y` +
      `&newEstPrdCnt=1`

    const response = await fetch(url)
    const rawText = await response.text()

    if (rawText.trimStart().startsWith('<')) {
      console.error('[KOSIS] HTML 응답:', rawText.slice(0, 120))
      return { data: buildFallback(gender), isFallback: true, fallbackReason: 'error' }
    }

    const data: any[] = JSON.parse(rawText)

    if (!Array.isArray(data) || data.length === 0 || data[0]?.err) {
      console.error('[KOSIS] 오류:', JSON.stringify(data)?.slice(0, 200))
      return { data: buildFallback(gender), isFallback: true, fallbackReason: 'error' }
    }

    // C3=C05(자산), ITM=T01(전가구 평균), C1=A0100(전체) 행만 사용
    const assetRows = data.filter(
      (r: any) => r.C3 === 'C05' && r.ITM_ID === 'T01' && r.C1 === 'A0100'
    )

    // C2 코드 → 자산값 맵
    const c2Values: Record<string, number> = {}
    for (const row of assetRows) {
      const val = parseFloat(row.DT ?? '0')
      if (!isNaN(val) && val > 0) c2Values[row.C2] = val
    }

    console.log('[KOSIS] c2Values:', JSON.stringify(c2Values))

    if (Object.keys(c2Values).length === 0) {
      return { data: buildFallback(gender), isFallback: true, fallbackReason: 'error' }
    }

    const result: AgeGroupAsset[] = AGE_GROUPS.map(ag => {
      const codes = C2_MAP[ag]
      const totalAssetRaw = codes.map(c => c2Values[c]).find(v => v !== undefined) ?? 0
      // 총자산 → 금융자산 환산
      const financialAsset = Math.round(totalAssetRaw * (FINANCIAL_RATIO[ag] ?? 0.3))
      const r = ASSET_RATIOS[ag]
      return {
        ageGroup: ag, gender,
        totalAsset: financialAsset > 0 ? financialAsset : buildFallback(gender).find(f => f.ageGroup === ag)!.totalAsset,
        deposit: r.deposit, stock: r.stock, insurance: r.insurance,
        other: Math.max(0, 100 - r.deposit - r.stock - r.insurance),
      }
    })

    console.log('[KOSIS] 파싱 결과:', result.map(r => `${r.ageGroup}:${r.totalAsset}만원`).join(', '))
    return { data: result, isFallback: false }
  } catch (e) {
    console.error('[KOSIS] fetch error:', e)
    return { data: buildFallback(gender), isFallback: true, fallbackReason: 'error' }
  }
}

export function getPeerComparison(
  ageGroupIndex: number,
  gender: 'male' | 'female',
  userAsset: number,
  userSavingsRatio: number,
): PeerComparison {
  const data = buildFallback(gender)
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
