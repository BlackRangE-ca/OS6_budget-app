import { supabase } from './supabase'
import { getEmbedding } from './hfApi'
import { KB_DOCUMENTS, KbDoc } from './knowledgeBase'
import { ConsumptionTypeResult } from './analyzeConsumption'
import { fetchDepositProducts, fetchSavingProducts } from './financeApi'
import { fetchKeyStatistics } from './economyApi'
import { fetchTopETFs } from './krxApi'

export type SearchResult = {
  id: number
  content: string
  metadata: Record<string, string>
  source: string
  similarity: number
}

// ── KB 시딩 ────────────────────────────────────────────────

export async function isKbSeeded(): Promise<boolean> {
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .is('user_id', null)
  if (error) {
    const msg = error.message ?? ''
    // 테이블이 없는 경우 (42P01 또는 PostgREST "relation does not exist")
    if (error.code === '42P01' || msg.includes('does not exist') || msg.includes('relation')) {
      throw new Error('documents 테이블 없음 — Supabase SQL Editor에서 pgvector_setup.sql 실행 필요')
    }
    throw new Error(`Supabase 오류 [${error.code}]: ${msg}`)
  }
  return (count ?? 0) >= KB_DOCUMENTS.length
}

// 정적 KB 문서 임베딩 후 저장 (KB 문서 수 변경 시 기존 삭제 후 재시딩)
export async function seedKnowledgeBase(
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  // 기존 KB 문서(user_id IS NULL) 전체 삭제 후 재삽입 — 중복 방지
  await supabase.from('documents').delete().is('user_id', null)

  for (let i = 0; i < KB_DOCUMENTS.length; i++) {
    const doc = KB_DOCUMENTS[i]
    const embedding = await getEmbedding(doc.content, 'passage')
    await supabase.from('documents').insert({
      content: doc.content,
      source: doc.source,
      metadata: doc.metadata,
      embedding: JSON.stringify(embedding),
      user_id: null,
    })
    onProgress?.(i + 1, KB_DOCUMENTS.length)
  }
}

// ── 사용자 소비 데이터 동기화 ─────────────────────────────

// 이번달 소비 요약을 자연어로 변환해 임베딩 후 저장 (매달 upsert)
export async function syncUserSpending(
  userId: string,
  month: string,
  analysis: ConsumptionTypeResult,
): Promise<void> {
  const { type, score, totalAmount, benchmarks, overSpentCategories } = analysis
  const bStr = benchmarks
    .map(b => `${b.category} ${b.myRatio}%(권장 ${b.benchmarkRatio}%)`)
    .join(', ')
  const content =
    `${month} 소비 현황: 총 ${totalAmount.toLocaleString()}원 지출. ` +
    `재무점수 ${score.total}/100(${score.grade}등급). ` +
    `소비유형: ${type}. ` +
    `카테고리별: ${bStr || '데이터 없음'}. ` +
    `과소비: ${overSpentCategories.join(', ') || '없음'}.`

  // 같은 달 기존 데이터 있으면 삭제 후 재삽입
  await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'user_spending')
    .filter('metadata->>month', 'eq', month)

  const embedding = await getEmbedding(content, 'passage')
  await supabase.from('documents').insert({
    content,
    source: 'user_spending',
    metadata: { month },
    embedding: JSON.stringify(embedding),
    user_id: userId,
  })
}

// ── 실시간 API 데이터 동기화 ──────────────────────────────

const parseMaxRate = (benefit: string) => {
  const m = benefit.match(/최고금리 ([\d.]+)%/)
  return m ? parseFloat(m[1]) : 0
}

export async function syncRealtimeData(): Promise<void> {
  await supabase.from('documents').delete().eq('source', 'realtime').is('user_id', null)

  const docs: { content: string }[] = []

  try {
    const [deposits, savings] = await Promise.all([
      fetchDepositProducts(),
      fetchSavingProducts(),
    ])

    const topDeposits = [...deposits]
      .sort((a, b) => parseMaxRate(b.benefit) - parseMaxRate(a.benefit))
      .slice(0, 5)
    if (topDeposits.length > 0) {
      docs.push({
        content:
          '현재 은행 정기예금 금리 현황 (금감원 실시간):\n' +
          topDeposits.map(d => `${d.target} "${d.title}" — ${d.benefit}`).join('\n'),
      })
    }

    const topSavings = [...savings]
      .sort((a, b) => parseMaxRate(b.benefit) - parseMaxRate(a.benefit))
      .slice(0, 5)
    if (topSavings.length > 0) {
      docs.push({
        content:
          '현재 은행 적금 금리 현황 (금감원 실시간):\n' +
          topSavings.map(d => `${d.target} "${d.title}" — ${d.benefit}`).join('\n'),
      })
    }
  } catch (e) {
    console.warn('[syncRealtimeData] 금감원 API 실패:', e)
  }

  try {
    const { data: indicators } = await fetchKeyStatistics()
    if (indicators.length > 0) {
      docs.push({
        content:
          '한국은행 주요 경제지표 (실시간):\n' +
          indicators.map(i => `${i.name}: ${i.value}${i.unit} (${i.time})`).join('\n'),
      })
    }
  } catch (e) {
    console.warn('[syncRealtimeData] BOK API 실패:', e)
  }

  try {
    const { data: etfs } = await fetchTopETFs()
    if (etfs.length > 0) {
      docs.push({
        content:
          '주요 ETF 현재가 현황 (KRX 실시간):\n' +
          etfs
            .map(
              e =>
                `${e.name}: ${e.price.toLocaleString()}원 (등락률 ${e.change >= 0 ? '+' : ''}${e.change}%, 순자산 ${e.aum.toLocaleString()}억원)`,
            )
            .join('\n'),
      })
    }
  } catch (e) {
    console.warn('[syncRealtimeData] KRX API 실패:', e)
  }

  const updatedAt = new Date().toISOString()
  for (const doc of docs) {
    const embedding = await getEmbedding(doc.content, 'passage')
    await supabase.from('documents').insert({
      content: doc.content,
      source: 'realtime',
      metadata: { updatedAt },
      embedding: JSON.stringify(embedding),
      user_id: null,
    })
  }
}

// ── 유사도 검색 ────────────────────────────────────────────

export async function searchDocuments(
  query: string,
  userId: string,
  topK = 5,
): Promise<SearchResult[]> {
  const embedding = await getEmbedding(query, 'query')

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.25,
    match_count: topK,
    filter_user_id: userId,
  })

  if (error) throw new Error(`pgvector 검색 실패: ${error.message}`)
  return (data ?? []) as SearchResult[]
}
