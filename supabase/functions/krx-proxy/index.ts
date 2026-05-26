import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const KRX_KEY = Deno.env.get('KRX_KEY')
const BASE_URL = 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 최근 영업일 (오늘 데이터 없으면 전일로 재시도)
function tradingDates(): string[] {
  const dates: string[] = []
  const d = new Date()
  let tries = 0
  while (dates.length < 5 && tries < 10) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dates.push(`${y}${m}${dd}`)
    }
    d.setDate(d.getDate() - 1)
    tries++
  }
  return dates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action } = await req.json()

    if (action === 'get_ip') {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipRes.json()
      return ok({ ip: ipData.ip })
    }

    if (action === 'fetch_etfs') {
      if (!KRX_KEY) return ok({ error: 'KRX_KEY_MISSING' })

      // 오늘부터 최근 5 영업일 순서로 데이터 있는 날 찾기
      for (const basDd of tradingDates()) {
        const res = await fetch(`${BASE_URL}?basDd=${basDd}`, {
          headers: { 'AUTH_KEY': KRX_KEY! },
        })
        const rawText = await res.text()

        if (rawText.trimStart().startsWith('<') || !res.ok) continue

        let parsed: { OutBlock_1?: unknown[] }
        try { parsed = JSON.parse(rawText) } catch { continue }

        if ((parsed as any)?.respCode === '401') {
          return ok({ error: `AUTH_FAILED: ${rawText.slice(0, 100)}` })
        }

        const rows = (parsed?.OutBlock_1 ?? []) as unknown[]
        if (rows.length === 0) continue

        console.log(`[krx-proxy] 기준일자 ${basDd}, ${rows.length}건`)
        return ok({ data: rows, basDd })
      }

      return ok({ error: 'NO_DATA_FOUND' })
    }

    return ok({ error: 'UNKNOWN_ACTION' })
  } catch (e) {
    console.error('[krx-proxy] unhandled:', e)
    return ok({ error: `UNHANDLED: ${String(e)}` })
  }
})
