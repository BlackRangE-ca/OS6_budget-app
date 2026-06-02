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
    // 기간: 오늘 기준 2개월 전 ~ 오늘
    const now = new Date()
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

    // 임대주택(06) + 주거복지(13) 공고 조회
    const buildUrl = (typeCode: string) =>
      `https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1` +
      `?serviceKey=${SERVICE_KEY}` +
      `&PG_SZ=10&PAGE=1` +
      `&UPP_AIS_TP_CD=${typeCode}` +
      `&PAN_ST_DT=${fmt(twoMonthsAgo)}` +
      `&PAN_ED_DT=${fmt(now)}`

    const [res06, res13] = await Promise.all([
      fetch(buildUrl('06')).then(r => r.text()),
      fetch(buildUrl('13')).then(r => r.text()),
    ])

    const parseItems = (rawText: string): any[] => {
      if (rawText.trimStart().startsWith('<')) return []
      try {
        const data = JSON.parse(rawText)
        // 응답 형식: [{dsSch:[...]}, {resHeader:[...], dsList:[...]}]
        const dsList = Array.isArray(data) ? data[1]?.dsList : data?.dsList
        return Array.isArray(dsList) ? dsList : []
      } catch { return [] }
    }

    const list = [...parseItems(res06), ...parseItems(res13)]
    if (list.length === 0) return { data: FALLBACK_HOUSING, isFallback: true }

    return {
      data: list.map((item: any, i: number) => ({
        id: item.PAN_ID ?? `lh-${i}`,
        title: item.PAN_NM ?? '임대주택 공고',
        category: item.AIS_TP_CD_NM ?? item.UPP_AIS_TP_NM ?? '공공임대',
        target: item.PAN_SS ?? '공고중',
        summary: `${item.CNP_CD_NM ?? '전국'} · ${item.AIS_TP_CD_NM ?? ''} 공고`,
        region: item.CNP_CD_NM ?? '전국',
        deadline: item.CLSG_DT ?? '공고 확인',
        link: item.DTL_URL ?? 'https://apply.lh.or.kr',
      })),
      isFallback: false,
    }
  } catch {
    return { data: FALLBACK_HOUSING, isFallback: true }
  }
}
