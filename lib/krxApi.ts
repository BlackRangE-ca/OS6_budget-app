import { supabase } from './supabase'

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
  { id: 'A091160', name: 'KODEX 반도체', price: 42100, aum: 6980, change: 0.5, category: '테마' },
  { id: 'A148070', name: 'KOSEF 국고채10년', price: 11320, aum: 5430, change: 0.0, category: '채권' },
]

export async function fetchTopETFs(): Promise<{ data: ETFProduct[]; isFallback: boolean; fallbackReason?: 'no_key' | 'error' }> {
  try {
    const { data: res, error } = await supabase.functions.invoke('krx-proxy', {
      body: { action: 'fetch_etfs' },
    })

    if (error || res?.error) {
      const msg = res?.error ?? error?.message ?? 'unknown'
      console.error('[KRX] edge function error:', msg)
      return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
    }

    const rows: any[] = res?.data ?? []
    if (rows.length === 0) {
      return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
    }

    const parse = (v: string | undefined) => Number((v ?? '0').replace(/,/g, ''))

    return {
      data: rows
        .sort((a, b) => parse(b.INVSTASST_NETASST_TOTAMT) - parse(a.INVSTASST_NETASST_TOTAMT))
        .slice(0, 10)
        .map((row, i) => ({
          id: row.ISU_CD ?? `etf-${i}`,
          name: row.ISU_NM ?? 'ETF',
          price: parse(row.TDD_CLSPRC),
          aum: Math.round(parse(row.INVSTASST_NETASST_TOTAMT) / 100000000),
          change: Number(row.FLUC_RT ?? 0),
          category: row.IDX_IND_NM ?? '기타',
        })),
      isFallback: false,
    }
  } catch (e) {
    console.error('[KRX] unexpected error:', e)
    return { data: FALLBACK_ETFS, isFallback: true, fallbackReason: 'error' }
  }
}

// 서버 IP 확인 (KRX 포털 등록용)
export async function getEdgeFunctionIp(): Promise<string> {
  const { data } = await supabase.functions.invoke('krx-proxy', {
    body: { action: 'get_ip' },
  })
  return data?.ip ?? 'unknown'
}
