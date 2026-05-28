import { supabase } from './supabase'
import { analyzeConsumptionType, ConsumptionTypeResult, Expense } from './analyzeConsumption'

export async function analyzeConsumptionTypeAI(
  expenses: Expense[],
  salary?: number | null,
  budget?: number | null,
  fixedExpenses?: Expense[],
): Promise<ConsumptionTypeResult> {
  const base = analyzeConsumptionType(expenses, salary, budget, fixedExpenses)

  if (base.totalAmount === 0) return base

  try {
    const catMap: Record<string, number> = {}
    expenses.filter(e => e.type !== 'income').forEach(e => {
      catMap[e.category] = (catMap[e.category] ?? 0) + e.amount
    })

    const categoryAmounts = Object.entries(catMap)
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat} ${amt.toLocaleString()}원`)
      .join(', ')

    const salaryLine = salary ? `월수입 ${salary.toLocaleString()}원` : '월수입 정보 없음'
    const overLine = base.overSpentCategories.length > 0
      ? base.overSpentCategories.join(', ')
      : '없음'

    const systemPrompt =
      `당신은 재무 분석 전문가입니다. 사용자 지출 데이터를 보고 소비 유형을 JSON으로만 반환하세요.\n` +
      `규칙: 한글만 사용, 영어/한자 금지. JSON 외 다른 텍스트 절대 금지.\n` +
      `형식: {"type":"소비유형(10자이내)","description":"이 사용자의 소비 특징 1~2문장","advice":"금액 기반 구체적 조언 1~2문장"}`

    const userMsg =
      `지출 데이터:\n` +
      `- 총지출: ${base.totalAmount.toLocaleString()}원\n` +
      `- ${salaryLine}\n` +
      `- 카테고리별: ${categoryAmounts}\n` +
      `- 초과지출: ${overLine}\n` +
      `- 재무점수: ${base.score.total}점 (${base.score.grade}등급)\n\n` +
      `위 데이터 기반으로 JSON만 반환하세요.`

    const { data, error } = await supabase.functions.invoke('hf-proxy', {
      body: {
        action: 'generate',
        systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      },
    })

    if (error || data?.error || !data?.text) return base

    const jsonMatch = (data.text as string).match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return base

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.type || !parsed.description || !parsed.advice) return base

    return {
      ...base,
      type: String(parsed.type).slice(0, 20),
      description: String(parsed.description),
      advice: String(parsed.advice),
    }
  } catch {
    return base
  }
}
