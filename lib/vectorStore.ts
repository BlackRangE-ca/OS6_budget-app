import { supabase } from './supabase'
import { getEmbedding } from './hfApi'
import { KB_DOCUMENTS, KbDoc } from './knowledgeBase'
import { ConsumptionTypeResult } from './analyzeConsumption'

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

// 정적 KB 문서 임베딩 후 저장 (초기 1회만 실행)
export async function seedKnowledgeBase(
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
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
