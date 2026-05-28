import { ConsumptionTypeResult } from './analyzeConsumption'
import { getEmbedding, generateResponse } from './hfApi'
import { searchDocuments } from './vectorStore'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AssetContext = {
  deposit: number
  savings: number
  stock: number
  insurance: number
  other: number
}

export async function sendMessage(
  messages: ChatMessage[],
  analysis: ConsumptionTypeResult,
  userId: string,
  salary?: number,
  assets?: AssetContext,
  riskType?: string,
): Promise<string> {
  const lastUserMsg = messages.findLast(m => m.role === 'user')?.content ?? ''

  const results = await searchDocuments(lastUserMsg, userId)

  const contextStr = results.length > 0
    ? results.map(r => `- ${r.metadata?.title ?? r.source}: ${r.content}`).join('\n')
    : ''

  const { type, description, advice, score, totalAmount, overSpentCategories, benchmarks, topCategory, topCategoryAmount } = analysis

  // 카테고리별 절대 금액 계산 (총지출 × 비율)
  const categoryAmounts = benchmarks
    .filter(b => b.myRatio > 0)
    .map(b => {
      const amount = Math.round(totalAmount * b.myRatio / 100)
      const recommended = Math.round((salary ?? totalAmount) * b.benchmarkRatio / 100)
      const gap = amount - recommended
      return `${b.category} ${amount.toLocaleString()}원(권장 ${recommended.toLocaleString()}원, ${gap > 0 ? '+' + gap.toLocaleString() : gap.toLocaleString()}원)`
    })
    .join(' / ')

  const salaryLine = salary
    ? `월 수입 ${salary.toLocaleString()}원 → 저축 여력 ${Math.max(0, salary - totalAmount).toLocaleString()}원`
    : `이번달 총지출 ${totalAmount.toLocaleString()}원`

  const overSpentDetail = overSpentCategories.length > 0
    ? overSpentCategories.map(cat => {
        const b = benchmarks.find(x => x.category === cat)
        if (!b) return cat
        const excess = Math.round(totalAmount * b.diff / 100)
        return `${cat}(권장보다 ${excess.toLocaleString()}원 초과)`
      }).join(', ')
    : '없음'

  const assetLine = assets
    ? (() => {
        const total = assets.deposit + assets.savings + assets.stock + assets.insurance + assets.other
        const stockRatio = total > 0 ? Math.round(assets.stock / total * 100) : 0
        const depositRatio = total > 0 ? Math.round((assets.deposit + assets.savings) / total * 100) : 0
        return `총자산 ${total.toLocaleString()}원 (예적금 ${(assets.deposit + assets.savings).toLocaleString()}원 ${depositRatio}% / 주식·펀드 ${assets.stock.toLocaleString()}원 ${stockRatio}% / 보험·연금 ${assets.insurance.toLocaleString()}원)`
      })()
    : null

  const foodExcess = (() => {
    const b = benchmarks.find(b => b.category === '식비')
    if (!b || b.diff <= 0) return ''
    return Math.round(totalAmount * b.diff / 100).toLocaleString()
  })()

  const riskLine = riskType ? `투자성향: ${riskType}\n` : ''

  const systemPrompt =
    `당신은 사회초년생 전담 AI 재무 코치입니다.\n` +
    `[언어 규칙 — 가장 중요] 한글과 숫자·%, ., 쉼표만 사용하세요. 한자(政府→정부, 國→국, 特別→특별 등), 중국어, 일본어, 베트남어, 영어, 로마자 모두 절대 사용 금지. 한자가 한 글자라도 나오면 답변 전체 무효입니다.\n\n` +

    `[이 사용자의 실제 재무 데이터]\n` +
    `${salaryLine}\n` +
    `소비유형: "${type}" — ${description}\n` +
    `재무점수: ${score.total}/100 (${score.grade}등급)\n` +
    riskLine +
    `카테고리별 지출: ${categoryAmounts}\n` +
    `초과지출 항목: ${overSpentDetail}\n` +
    `가장 많이 쓴 항목: ${topCategory} ${topCategoryAmount.toLocaleString()}원\n` +
    (assetLine ? `${assetLine}\n` : '') +
    `\n` +

    (contextStr ? `[관련 청년 정책·금융 상품]\n${contextStr}\n\n` : '') +

    `[답변 규칙 — 반드시 준수]\n` +
    `1. "일반적으로", "20대는", "보통 사람들은" 같은 일반론 절대 금지. 위 사용자의 실제 숫자만 근거로 사용하세요.\n` +
    `2. 또래 비교 질문 시: 위 카테고리별 지출과 재무점수를 기준으로 "이 사용자는 ${type} 유형으로 ${score.grade}등급이고, ${overSpentCategories.length > 0 ? overSpentCategories.join('·') + ' 지출이 또래 평균보다 높아요' : '지출 구조는 또래 평균과 비슷해요'}"처럼 실제 데이터로 분석하세요.\n` +
    `3. 투자 질문 시: ${riskType ? `이 사용자의 투자성향은 ${riskType}이므로 그에 맞는 상품(${riskType === '공격형' || riskType === '성장형' ? '나스닥100·S&P500 ETF 중심' : riskType === '보수형' ? '예적금·채권ETF 중심' : '예금+ETF 균형'})을 구체적으로 제안하세요.` : '위 자산 현황을 그대로 사용해 구체적 비중·상품명을 제안하세요. "일반적 투자 방법" 언급 금지.'}\n` +
    `4. ${foodExcess ? `"식비를 줄이세요" 대신 "식비 ${foodExcess}원을 아끼면 월 적금이 늘어요"처럼` : '카테고리 이름 대신'} 금액 기반으로 구체적으로 말하세요.\n` +
    `5. 관련 청년 정책·상품이 있으면 이름과 핵심 혜택 1줄 추가.\n` +
    `6. 3~5문장 이내, 친근하고 실용적인 말투. 한글·숫자·기호만 사용, 한자·영문자 한 글자도 금지.`

  return generateResponse(systemPrompt, messages)
}

export function makeWelcomeMessage(analysis: ConsumptionTypeResult): string {
  const { type, score, overSpentCategories, advice } = analysis
  const emoji: Record<string, string> = { S: '🏆', A: '✨', B: '👍', C: '💡', D: '⚠️' }

  let msg = `안녕하세요! ${emoji[score.grade] ?? '💬'} 재무점수 ${score.total}점 (${score.grade}등급), 소비유형은 "${type}"이에요.\n\n`

  if (overSpentCategories.length > 0) {
    msg += `${overSpentCategories.join(', ')} 지출이 권장 비율보다 높아요. `
  }

  // 사전 분석 조언 한 문장 발췌
  const firstSentence = advice.split(/[.。]/)[0]
  if (firstSentence?.trim()) {
    msg += `${firstSentence.trim()}.\n\n`
  }

  msg += `구체적으로 어떻게 개선할지, 어떤 정책을 활용할 수 있는지 물어보세요!`
  return msg
}
