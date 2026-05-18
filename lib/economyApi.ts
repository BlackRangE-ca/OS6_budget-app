const BOK_KEY = process.env.EXPO_PUBLIC_BOK_KEY

export type EconomyIndicator = {
  id: string
  name: string
  value: string
  unit: string
  time: string
  cycle: string
}

export type ExchangeRate = {
  currency: string
  code: string
  flag: string
  rate: string
  unit: string
  time: string
  isFallback?: boolean
}

// ECOS KeyStatisticList에 실제로 있는 지표 키워드
const RELEVANT_KEYWORDS = [
  '기준금리', '소비자물가', '실업률', 'GDP', '취업자', '국고채'
]


// 표시명 간소화
const NAME_MAP: Record<string, string> = {
  '소비자물가지수(전년동월비)': '소비자물가 상승률',
  '소비자물가지수(전년동기비)': '소비자물가 상승률',
  '실업률(계절조정)': '실업률',
  '청년실업률(15~29세)': '청년 실업률',
  '국고채(10년)': '국고채 10년 금리',
  '주택담보대출금리(신규취급액기준)': '주택담보대출 금리',
}

function simplifyName(raw: string): string {
  return NAME_MAP[raw] ?? raw
}

function formatValue(value: string, unit: string): { value: string; unit: string } {
  const num = parseFloat(value.replace(/,/g, ''))
  if (isNaN(num)) return { value: value ?? '-', unit }
  if (unit.includes('십억원')) {
    return num >= 1000
      ? { value: `${(num / 1000).toFixed(0)}`, unit: '조원' }
      : { value: `${num.toFixed(0)}`, unit: '십억원' }
  }
  if (value.includes('.')) return { value: num.toFixed(2), unit }
  return { value: num.toLocaleString(), unit }
}

export async function fetchKeyStatistics(): Promise<{ data: EconomyIndicator[]; isFallback: boolean }> {
  if (!BOK_KEY) return { data: getFallbackIndicators(), isFallback: true }

  try {
    const url = `https://ecos.bok.or.kr/api/KeyStatisticList/${BOK_KEY}/json/kr/1/100`
    const response = await fetch(url)
    const data = await response.json()
    const list: any[] = data?.KeyStatisticList?.row ?? []
    if (list.length === 0) return { data: getFallbackIndicators(), isFallback: true }

    const filtered = list.filter(item =>
      RELEVANT_KEYWORDS.some(k => (item.KEYSTAT_NAME ?? '').includes(k))
    )

    const apiResults = (filtered.length > 0 ? filtered : list).slice(0, 6).map((item: any, index: number) => {
      const { value, unit } = formatValue(item.DATA_VALUE ?? '-', item.UNIT_NAME ?? '')
      return {
        id: `economy-${index}`,
        name: simplifyName(item.KEYSTAT_NAME ?? '경제지표'),
        value,
        unit,
        time: item.TIME ?? '',
        cycle: item.CYCLE ?? '',
      }
    })

    return { data: apiResults, isFallback: false }
  } catch {
    return { data: getFallbackIndicators(), isFallback: true }
  }
}

function getFallbackIndicators(): EconomyIndicator[] {
  return [
    { id: 'e1', name: '기준금리', value: '3.50', unit: '%', time: '2025.02', cycle: '월' },
    { id: 'e2', name: '소비자물가 상승률', value: '2.1', unit: '%', time: '2025.04', cycle: '월' },
    { id: 'e3', name: '청년 실업률', value: '5.9', unit: '%', time: '2025.03', cycle: '월' },
    { id: 'e4', name: '실업률', value: '2.8', unit: '%', time: '2025.03', cycle: '월' },
    { id: 'e5', name: 'GDP 성장률', value: '2.1', unit: '%', time: '2024', cycle: '연' },
    { id: 'e6', name: '국고채 10년 금리', value: '3.12', unit: '%', time: '2025.05', cycle: '월' },
    { id: 'e7', name: '주택담보대출 금리', value: '3.85', unit: '%', time: '2025.04', cycle: '월' },
  ]
}

// ── 환율 ──────────────────────────────────────────────

const EXCHANGE_CURRENCIES = [
  { code: 'USD', itemCode: '0000001', flag: '🇺🇸', currency: '미국 달러' },
  { code: 'JPY', itemCode: '0000002', flag: '🇯🇵', currency: '일본 엔 (100엔)' },
  { code: 'EUR', itemCode: '0000003', flag: '🇪🇺', currency: '유럽 유로' },
  { code: 'GBP', itemCode: '0000004', flag: '🇬🇧', currency: '영국 파운드' },
  { code: 'CNY', itemCode: '0000053', flag: '🇨🇳', currency: '중국 위안' },
]

const FALLBACK_RATES: ExchangeRate[] = [
  { currency: '미국 달러',      code: 'USD', flag: '🇺🇸', rate: '1,340', unit: '원', time: '참고값', isFallback: true },
  { currency: '일본 엔 (100엔)', code: 'JPY', flag: '🇯🇵', rate: '890',   unit: '원', time: '참고값', isFallback: true },
  { currency: '유럽 유로',      code: 'EUR', flag: '🇪🇺', rate: '1,480', unit: '원', time: '참고값', isFallback: true },
  { currency: '영국 파운드',    code: 'GBP', flag: '🇬🇧', rate: '1,720', unit: '원', time: '참고값', isFallback: true },
  { currency: '중국 위안',      code: 'CNY', flag: '🇨🇳', rate: '185',   unit: '원', time: '참고값', isFallback: true },
]

function dateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export async function fetchExchangeRates(): Promise<{ data: ExchangeRate[]; isFallback: boolean }> {
  if (!BOK_KEY) return { data: FALLBACK_RATES, isFallback: true }

  try {
    // 최근 14일치 요청해서 각 통화별로 최신값 뽑기
    const url =
      `https://ecos.bok.or.kr/api/StatisticSearch/${BOK_KEY}/json/kr/1/100/731Y001/D/${dateStr(-14)}/${dateStr()}`

    const res = await fetch(url)
    const data = await res.json()
    const rows: any[] = data?.StatisticSearch?.row ?? []

    let hadFallback = false
    const results: ExchangeRate[] = []
    for (const cur of EXCHANGE_CURRENCIES) {
      const latest = rows
        .filter(r => r.ITEM_CODE1 === cur.itemCode && r.DATA_VALUE)
        .sort((a, b) => b.TIME.localeCompare(a.TIME))[0]

      if (latest) {
        const raw = parseFloat(latest.DATA_VALUE)
        results.push({
          currency: cur.currency,
          code: cur.code,
          flag: cur.flag,
          rate: raw.toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
          unit: '원',
          time: `${latest.TIME.slice(0, 4)}.${latest.TIME.slice(4, 6)}.${latest.TIME.slice(6)}`,
        })
      } else {
        hadFallback = true
        const fb = FALLBACK_RATES.find(f => f.code === cur.code)
        if (fb) results.push(fb)
      }
    }

    if (results.length === 0) return { data: FALLBACK_RATES, isFallback: true }
    return { data: results, isFallback: hadFallback }
  } catch {
    return { data: FALLBACK_RATES, isFallback: true }
  }
}
