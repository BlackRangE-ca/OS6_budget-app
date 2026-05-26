// HuggingFace API - Supabase Edge Function 프록시를 통해 호출
// 모바일 기기에서 api-inference.huggingface.co 직접 접근 불가 문제 우회
// Edge Function: supabase/functions/hf-proxy/index.ts

import { supabase } from './supabase'
import { ChatMessage } from './chatApi'

// ── 임베딩 ─────────────────────────────────────────────────
export async function getEmbedding(text: string, _type: 'query' | 'passage' = 'passage'): Promise<number[]> {
  const { data, error } = await supabase.functions.invoke('hf-proxy', {
    body: { action: 'embed', text },
  })
  if (error) throw new Error(`임베딩 Edge Function 오류: ${error.message}`)
  if (data?.error) throw new Error(`임베딩 HF 오류: ${data.error}`)

  const raw = data?.embedding
  if (!raw) throw new Error('임베딩 응답 없음')

  // 응답 형식 정규화: 1D / [[...]] 배치 / [[[...]]] 토큰별
  if (typeof raw[0] === 'number') return raw as number[]
  if (typeof raw[0]?.[0] === 'number') return raw[0] as number[]
  if (Array.isArray(raw[0]?.[0])) {
    const tokens = raw[0] as number[][]
    const dim = tokens[0].length
    const mean = new Array(dim).fill(0)
    for (const tok of tokens) tok.forEach((v: number, i: number) => { mean[i] += v })
    return mean.map((v: number) => v / tokens.length)
  }
  throw new Error(`알 수 없는 임베딩 형식: ${JSON.stringify(raw).slice(0, 80)}`)
}

// ── 텍스트 생성 (Google Gemma 2B-it) ──────────────────────
export async function generateResponse(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const recentMessages = messages.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  const { data, error } = await supabase.functions.invoke('hf-proxy', {
    body: { action: 'generate', systemPrompt, messages: recentMessages },
  })
  if (error) throw new Error(`생성 Edge Function 오류: ${error.message}`)
  if (data?.error) throw new Error(`생성 HF 오류: ${data.error}`)
  if (!data?.text) throw new Error('생성 응답 없음')

  return data.text
}
