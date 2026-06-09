import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const HF_TOKEN = Deno.env.get('HF_TOKEN')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const GEN_MODEL = 'llama-3.3-70b-versatile'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, text, messages, systemPrompt } = await req.json()

    // ── 임베딩 (Supabase 내장 AI - 외부 네트워크 불필요) ────
    if (action === 'embed') {
      // @ts-ignore: Supabase edge runtime 전용 전역
      const session = new Supabase.ai.Session('gte-small')
      const output = await session.run(text, { mean_pool: true, normalize: true })
      console.log('[hf-proxy] embed output type:', typeof output, output?.constructor?.name)

      let embedding: number[]
      if (output instanceof Float32Array || ArrayBuffer.isView(output)) {
        embedding = Array.from(output as Float32Array)
      } else if (Array.isArray(output)) {
        embedding = output as number[]
      } else if (output && typeof output === 'object' && 'data' in output) {
        embedding = Array.from((output as { data: Float32Array }).data)
      } else {
        console.error('[hf-proxy] unknown embed output:', String(output).slice(0, 100))
        return ok({ error: `EMBED_FORMAT_UNKNOWN: ${typeof output} ${String(output).slice(0, 80)}` })
      }
      return ok({ embedding })
    }

    // ── 텍스트 생성 (Groq - gemma2-9b-it) ──────────────────
    if (action === 'generate') {
      if (!GROQ_API_KEY) {
        console.error('[hf-proxy] GROQ_API_KEY secret not set')
        return ok({ error: 'GROQ_API_KEY_MISSING' })
      }

      const res = await fetch(
        `https://api.groq.com/openai/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: GEN_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            max_tokens: 400,
            temperature: 0.7,
            stream: false,
          }),
        }
      )

      const raw = await res.text()
      console.log('[hf-proxy] generate status:', res.status, raw.slice(0, 120))

      if (!res.ok) {
        return ok({ error: `HF_GEN_${res.status}: ${raw.slice(0, 200)}` })
      }

      let data: { choices?: { message?: { content?: string } }[] }
      try { data = JSON.parse(raw) } catch {
        return ok({ error: `GEN_PARSE_ERR: ${raw.slice(0, 100)}` })
      }

      const genText = data.choices?.[0]?.message?.content?.trim() ?? ''
      return ok({ text: genText })
    }

    return ok({ error: 'UNKNOWN_ACTION' })
  } catch (e) {
    console.error('[hf-proxy] unhandled:', e)
    return ok({ error: `UNHANDLED: ${String(e)}` })
  }
})
