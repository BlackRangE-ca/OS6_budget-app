const KRX_KEY = process.env.EXPO_PUBLIC_KRX_KEY

export type ETFProduct = {
  id: string
  name: string
  price: number
  aum: number        // 순자산총액 (억원)
  change: number     // 전일 대비 등락률 (%)
  category: string
}

const FALLBACK_ETFS: ETFProduct[] = [
  { id: 'A069500', name: 'KODEX 200', price: 34520, aum: 54320, change: 0.3, category: '국내주식' },
  { id: 'A360750', name: 'TIGER 미국S&P500', price: 17230, aum: 43810, change: 0.8, category: '해외주식' },
  { id: 'A133690', name: 'TIGER 미국나스닥100', price: 103450, aum: 31200, change: 1.2, category: '해외주식' },
  { id: 'A229200', name: 'KODEX 코스닥150', price: 11820, aum: 18750, change: -0.4, category: '국내주식' },
  { id: 'A411060', name: 'ACE 미국배당다우존스', price: 14320, aum: 15430, change: 0.2, category: '해외주식' },
  { id: 'A379800', name: 'KODEX 미국S&P500TR', price: 16890, aum: 12300, change: 0.7, category: '해외주식' },
  { id: 'A152100', name: 'ARIRANG 고배당주', price: 11250, aum: 8920, change: 0.1, category: '국내주식' },
  { id: 'A kodex', name: 'KODEX 2차전지산업', price: 16430, aum: 7650, change: -1.1, category: '테마' },
  { id: 'A091160', name: 'KODEX 반도체', price: 42100, aum: 6980, change: 0.5, category: '테마' },
  { id: 'A148070', name: 'KOSEF 국고채10년', price: 11320, aum: 5430, change: 0.0, category: '채권' },
]

export async function fetchTopETFs(): Promise<{ data: ETFProduct[]; isFallback: boolean; fallbackReason?: 'no_key' | 'error' }> {
  if (!KRX_KEY) return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'no_key' }

  try {
    const otpRes = await fetch(
      `https://openapi.krx.co.kr/contents/COM/GenerateOTP.cmd` +
      `?bld=dbms/MDC/STAT/standard/MDCSTAT04301&locale=ko_KR&auth=${KRX_KEY}`
    )
    const otp = await otpRes.text()
    if (!otp || otp.length < 10 || otp.trimStart().startsWith('<')) {
      console.error('[KRX] OTP error — IP 미등록이거나 키 오류. preview:', otp?.slice(0, 120))
      return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
    }

    const dataRes = await fetch(
      'https://openapi.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT04301',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `code=${otp}`,
      }
    )
    const rawText = await dataRes.text()
    if (rawText.trimStart().startsWith('<')) {
      console.error('[KRX] data response is HTML, not JSON')
      return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
    }
    const data = JSON.parse(rawText)
    const rows: any[] = data?.output ?? []

    if (rows.length === 0) {
      console.error('[KRX] empty output:', JSON.stringify(data)?.slice(0, 300))
      return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
    }

    return {
      data: rows
        .sort((a, b) => Number(b.NASS_EVLAMT ?? 0) - Number(a.NASS_EVLAMT ?? 0))
        .slice(0, 10)
        .map((row, i) => ({
          id: row.ISU_CD ?? `etf-${i}`,
          name: row.ISU_NM ?? 'ETF',
          price: Number(row.CLSPRC?.replace(/,/g, '') ?? 0),
          aum: Math.round(Number(row.NASS_EVLAMT?.replace(/,/g, '') ?? 0) / 100000000),
          change: Number(row.FLUC_RT ?? 0),
          category: row.IDX_IND_NM ?? '기타',
        })),
      isFallback: false,
    }
  } catch (e) {
    console.error('[KRX] fetch error:', e)
    return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
  }
}
