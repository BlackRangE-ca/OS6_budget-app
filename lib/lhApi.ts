const SERVICE_KEY = process.env.EXPO_PUBLIC_PUBLIC_DATA_KEY

export type HousingNotice = {
  id: string
  title: string
  category: string
  target: string
  summary: string
  region: string
  deadline: string
  link: string
}

const FALLBACK_HOUSING: HousingNotice[] = [
  {
    id: 'lh-1',
    title: '청년 전세임대주택',
    category: '전세임대',
    target: '만 19~39세 무주택 청년',
    summary: '청년이 원하는 집을 LH가 전세계약 후 저렴하게 재임대해주는 제도예요.',
    region: '전국',
    deadline: '수시모집',
    link: 'https://apply.lh.or.kr',
  },
  {
    id: 'lh-2',
    title: '청년 매입임대주택',
    category: '매입임대',
    target: '만 19~39세 무주택 청년, 대학생',
    summary: 'LH가 기존 주택을 매입해 시세 40~50% 수준으로 임대해요. 보증금 100만원부터 가능해요.',
    region: '전국',
    deadline: '수시모집',
    link: 'https://apply.lh.or.kr',
  },
  {
    id: 'lh-3',
    title: '행복주택',
    category: '공공임대',
    target: '청년·신혼부부·대학생 등',
    summary: '직장·학교 가까운 곳에 시세 60~80% 수준으로 공급하는 공공임대주택이에요.',
    region: '전국',
    deadline: '공고별 상이',
    link: 'https://apply.lh.or.kr',
  },
  {
    id: 'lh-4',
    title: '청년 주택드림 대출',
    category: '주택대출',
    target: '만 39세 이하 무주택 청년',
    summary: '생애 최초 주택 구입 시 연 2.2%~3.0% 저금리로 최대 3억원까지 대출 가능해요.',
    region: '전국',
    deadline: '상시',
    link: 'https://nhuf.molit.go.kr',
  },
  {
    id: 'lh-5',
    title: '청년 전용 버팀목 전세자금대출',
    category: '전세대출',
    target: '만 34세 이하 무주택 단독세대주',
    summary: '연 1.8%~2.7% 금리로 최대 7,000만원까지 전세자금 대출. 수도권 기준 보증금 3억원 이하.',
    region: '전국',
    deadline: '상시',
    link: 'https://nhuf.molit.go.kr',
  },
]

export async function fetchYouthHousing(): Promise<{ data: HousingNotice[]; isFallback: boolean }> {
  if (!SERVICE_KEY) return { data: FALLBACK_HOUSING, isFallback: true }

  try {
    const url =
      `https://apis.data.go.kr/B552854/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1` +
      `?serviceKey=${SERVICE_KEY}` +
      `&type=json` +
      `&PG_SZ=10` +
      `&PAGE_NO=1`

    const res = await fetch(url)
    const rawText = await res.text()
    console.log('[LH] status:', res.status, '| preview:', rawText.slice(0, 300))
    if (rawText.trimStart().startsWith('<')) {
      const errType = rawText.includes('Forbidden') ? 'Forbidden (API 활용신청 필요)'
        : rawText.includes('NOT_REGISTERED') ? 'KEY_NOT_REGISTERED'
        : rawText.includes('ACCESS_DENIED') ? 'ACCESS_DENIED'
        : 'XML_ERROR'
      console.error('[LH]', errType, ':', rawText.slice(0, 200))
      return { data: FALLBACK_HOUSING, isFallback: true }
    }
    const data = JSON.parse(rawText)

    // 공공데이터포털 표준 응답 형식 + LH 자체 형식 모두 시도
    const rawItems = data?.response?.body?.items?.item
      ?? data?.response?.body?.items
      ?? data?.dsList
      ?? data?.body?.items
      ?? []
    const list = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : [])

    if (list.length === 0) return { data: FALLBACK_HOUSING, isFallback: true }

    return {
      data: list.map((item: any, i: number) => ({
        id: item.PBLANC_NO ?? `lh-${i}`,
        title: item.HOUSE_NM ?? '임대주택 공고',
        category: item.HOUSE_SE_NM ?? '공공임대',
        target: item.RCRIT_PBLANC_DE ? `청약 마감: ${item.RCRIT_PBLANC_DE}` : '청년',
        summary: `${item.SUBSCRPT_AREA_CODE_NM ?? '전국'} · ${item.HOUSE_SE_NM ?? ''} 공급`,
        region: item.SUBSCRPT_AREA_CODE_NM ?? '전국',
        deadline: item.RCRIT_PBLANC_DE ?? '공고 확인',
        link: 'https://apply.lh.or.kr',
      })),
      isFallback: false,
    }
  } catch {
    return { data: FALLBACK_HOUSING, isFallback: true }
  }
}
