export type ExpenseCategory =
  | '식비' | '교통' | '주거' | '통신' | '의료'
  | '문화' | '쇼핑' | '저축' | '기타'

export type Expense = {
  id?: string
  category: ExpenseCategory
  amount: number
  date?: string
  type?: string
}

// 사회초년생 권장 지출 비율 (수입 대비 %)
export const JUNIOR_BENCHMARKS: Record<string, number> = {
  주거: 30, 식비: 15, 교통: 10, 통신: 5,
  의료: 5, 문화: 5, 쇼핑: 10, 기타: 5,
}

export type BenchmarkComparison = {
  category: string
  myRatio: number
  benchmarkRatio: number
  diff: number
}

export type FinancialScore = {
  total: number
  savingsScore: number
  fixedCostScore: number
  budgetScore: number
  concentrationScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  gradeMessage: string
}

export type ConsumptionTypeResult = {
  type: string
  description: string
  advice: string
  totalAmount: number
  topCategory: string
  topCategoryAmount: number
  topCategoryRatio: number
  score: FinancialScore
  benchmarks: BenchmarkComparison[]
  overSpentCategories: string[]
}

// 사회초년생 벤치마크 비교
export function getBenchmarkComparison(
  expenses: Expense[],
  salary: number | null
): BenchmarkComparison[] {
  const total = salary ?? expenses.reduce((s, e) => s + e.amount, 0)
  if (total === 0) return []

  const catMap: Record<string, number> = {}
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category] ?? 0) + e.amount })

  return Object.entries(JUNIOR_BENCHMARKS).map(([category, benchmark]) => {
    const myRatio = Math.round(((catMap[category] ?? 0) / total) * 100)
    return { category, myRatio, benchmarkRatio: benchmark, diff: myRatio - benchmark }
  }).filter(b => b.myRatio > 0 || b.diff !== 0)
}

// 다차원 재무 건강 점수 계산
export function calculateFinancialScore(
  expenses: Expense[],
  salary: number | null,
  budget: number | null,
  fixedExpenses: Expense[]
): FinancialScore {
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // 저축률 점수 (0~25): 수입 대비 저축 비율
  let savingsScore = 5
  if (salary && salary > 0) {
    const savingsAmount = expenses
      .filter(e => e.category === '저축' || e.type === 'income')
      .reduce((s, e) => s + e.amount, 0)
    const savingsRatio = savingsAmount / salary
    if (savingsRatio >= 0.2) savingsScore = 25
    else if (savingsRatio >= 0.15) savingsScore = 20
    else if (savingsRatio >= 0.1) savingsScore = 15
    else if (savingsRatio >= 0.05) savingsScore = 10
  } else {
    savingsScore = 12 // 수입 정보 없으면 중간값
  }

  // 고정비율 점수 (0~25): 고정비 낮을수록 좋음
  let fixedCostScore = 12
  if (total > 0) {
    const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0)
    const fixedRatio = fixedTotal / total
    if (fixedRatio < 0.4) fixedCostScore = 25
    else if (fixedRatio < 0.5) fixedCostScore = 20
    else if (fixedRatio < 0.6) fixedCostScore = 15
    else if (fixedRatio < 0.7) fixedCostScore = 8
    else fixedCostScore = 3
  }

  // 예산 준수 점수 (0~25)
  let budgetScore = 12
  if (budget && budget > 0 && total > 0) {
    const usedRatio = total / budget
    if (usedRatio <= 0.7) budgetScore = 25
    else if (usedRatio <= 0.8) budgetScore = 22
    else if (usedRatio <= 0.9) budgetScore = 18
    else if (usedRatio <= 1.0) budgetScore = 12
    else if (usedRatio <= 1.1) budgetScore = 6
    else budgetScore = 0
  }

  // 편중도 점수 (0~25): 특정 카테고리 과집중 없을수록 좋음
  let concentrationScore = 12
  if (total > 0) {
    const catMap: Record<string, number> = {}
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] ?? 0) + e.amount })
    const topRatio = Math.max(...Object.values(catMap)) / total
    if (topRatio < 0.3) concentrationScore = 25
    else if (topRatio < 0.4) concentrationScore = 20
    else if (topRatio < 0.5) concentrationScore = 15
    else if (topRatio < 0.6) concentrationScore = 8
    else concentrationScore = 3
  }

  const total_score = savingsScore + fixedCostScore + budgetScore + concentrationScore

  let grade: 'S' | 'A' | 'B' | 'C' | 'D'
  let gradeMessage: string
  if (total_score >= 80) { grade = 'S'; gradeMessage = '재무 관리 우수해요!' }
  else if (total_score >= 65) { grade = 'A'; gradeMessage = '안정적인 소비 패턴이에요' }
  else if (total_score >= 50) { grade = 'B'; gradeMessage = '조금만 더 다듬어봐요' }
  else if (total_score >= 35) { grade = 'C'; gradeMessage = '개선이 필요한 항목이 있어요' }
  else { grade = 'D'; gradeMessage = '재무 점검이 시급해요' }

  return { total: total_score, savingsScore, fixedCostScore, budgetScore, concentrationScore, grade, gradeMessage }
}

export function analyzeConsumptionType(
  expenses: Expense[],
  salary?: number | null,
  budget?: number | null,
  fixedExpenses?: Expense[]
): ConsumptionTypeResult {
  const spendingExpenses = expenses.filter(e => e.type !== 'income')
  const totalAmount = spendingExpenses.reduce((sum, e) => sum + e.amount, 0)

  const emptyScore: FinancialScore = {
    total: 0, savingsScore: 0, fixedCostScore: 0,
    budgetScore: 0, concentrationScore: 0, grade: 'D', gradeMessage: '데이터 부족'
  }

  if (spendingExpenses.length === 0 || totalAmount === 0) {
    return {
      type: '분석 데이터 부족', description: '아직 소비 기록이 부족합니다.',
      advice: '소비를 입력하면 유형 분석이 가능합니다.',
      totalAmount: 0, topCategory: '-', topCategoryAmount: 0, topCategoryRatio: 0,
      score: emptyScore, benchmarks: [], overSpentCategories: [],
    }
  }

  const categoryMap: Record<string, number> = {}
  spendingExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount
  })

  const sorted = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])
  const [topCategory, topCategoryAmount] = sorted[0]
  const topCategoryRatio = topCategoryAmount / totalAmount

  const ratio = (cat: string) => (categoryMap[cat] ?? 0) / totalAmount

  // 과소비 카테고리: 예산 대비 초과 or 벤치마크 2배 초과
  const overSpentCategories = Object.entries(categoryMap)
    .filter(([cat, amt]) => {
      const benchmark = JUNIOR_BENCHMARKS[cat]
      if (!benchmark) return false
      const myRatio = amt / totalAmount * 100
      return myRatio > benchmark * 1.8
    })
    .map(([cat]) => cat)

  // 소비 유형 분류 (예산 대비 비율 기준으로 수정)
  const budgetUsedRatio = budget && budget > 0 ? totalAmount / budget : null

  let type = '균형 소비형'
  let description = '특정 카테고리에 소비가 크게 치우치지 않은 안정적인 소비 패턴입니다.'
  let advice = '현재 소비 패턴을 유지하되, 목표 저축액을 먼저 설정해보세요.'

  if (ratio('저축') >= 0.3) {
    type = '저축 중심형'
    description = '전체 지출 중 저축 비중이 높아 미래 대비 성향이 강합니다.'
    advice = '저축을 유지하되, 생활비가 지나치게 부족하지 않은지 점검해보세요.'
  } else if (ratio('주거') >= 0.4) {
    type = '주거비 부담형'
    description = '주거비 비중이 높아 다른 소비 여력이 줄어들 수 있습니다.'
    advice = '월세·관리비 등 고정 주거비를 점검하고 예산 비중을 조정해보세요.'
  } else if (topCategoryRatio >= 0.5) {
    type = '편중 소비형'
    description = `${topCategory} 지출이 전체 소비의 절반 이상을 차지합니다.`
    advice = `${topCategory} 소비를 20%만 줄여도 월 ${Math.round(topCategoryAmount * 0.2).toLocaleString()}원 절약할 수 있어요.`
  } else if (ratio('쇼핑') + ratio('문화') >= 0.4) {
    type = '여가·쇼핑 소비형'
    description = '쇼핑과 문화 소비 비중이 높아 선택적 소비가 많은 편입니다.'
    advice = '쇼핑과 문화생활 예산을 미리 정해두면 충동 소비를 줄일 수 있어요.'
  } else if (ratio('식비') >= 0.35) {
    type = '식비 집중형'
    description = '식비 비중이 높아 외식이나 배달 소비가 많을 가능성이 있습니다.'
    advice = '외식·배달 횟수를 줄이고 주간 식비 한도를 설정해보세요.'
  } else if (ratio('통신') >= 0.2) {
    type = '통신비 부담형'
    description = '통신비 비중이 상대적으로 높은 편입니다.'
    advice = '요금제·구독 서비스·부가서비스를 점검해 고정비를 줄여보세요.'
  } else if (ratio('의료') >= 0.25) {
    type = '건강관리 지출형'
    description = '의료 관련 지출 비중이 높은 소비 패턴입니다.'
    advice = '반복적으로 발생하는 의료비가 있다면 월별 예산에 따로 반영해보세요.'
  } else if (ratio('교통') >= 0.25) {
    type = '이동비 부담형'
    description = '교통비 비중이 높아 이동 관련 지출이 많은 편입니다.'
    advice = '대중교통 정기권, 이동 경로 조정 등으로 교통비를 관리해보세요.'
  } else if (budgetUsedRatio !== null && budgetUsedRatio > 1.1) {
    // 과소비 기준: 고정 금액 아닌 예산 대비 110% 초과
    type = '과소비 위험형'
    description = `이번달 예산의 ${Math.round(budgetUsedRatio * 100)}%를 사용했습니다.`
    advice = '카테고리별 한도를 설정하고 주간 단위로 소비를 점검하는 것이 좋아요.'
  }

  const score = calculateFinancialScore(
    expenses, salary ?? null, budget ?? null, fixedExpenses ?? []
  )
  const benchmarks = getBenchmarkComparison(spendingExpenses, salary ?? null)

  return {
    type, description, advice, totalAmount,
    topCategory, topCategoryAmount,
    topCategoryRatio: Math.round(topCategoryRatio * 100),
    score, benchmarks, overSpentCategories,
  }
}
