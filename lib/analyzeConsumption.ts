export type ExpenseCategory =
  | "식비"
  | "교통"
  | "주거"
  | "통신"
  | "의료"
  | "문화"
  | "쇼핑"
  | "저축"
  | "기타";

export type Expense = {
  id?: string;
  category: ExpenseCategory;
  amount: number;
  date?: string;
};

export type ConsumptionTypeResult = {
  type: string;
  description: string;
  advice: string;
  totalAmount: number;
  topCategory: string;
  topCategoryAmount: number;
  topCategoryRatio: number;
};

export function analyzeConsumptionType(
  expenses: Expense[]
): ConsumptionTypeResult {
  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (expenses.length === 0 || totalAmount === 0) {
    return {
      type: "분석 데이터 부족",
      description: "아직 소비 기록이 부족합니다.",
      advice: "소비를 입력하면 유형 분석이 가능합니다.",
      totalAmount: 0,
      topCategory: "-",
      topCategoryAmount: 0,
      topCategoryRatio: 0,
    };
  }

  const categoryMap: Record<ExpenseCategory, number> = {
    식비: 0,
    교통: 0,
    주거: 0,
    통신: 0,
    의료: 0,
    문화: 0,
    쇼핑: 0,
    저축: 0,
    기타: 0,
  };

  expenses.forEach((item) => {
    categoryMap[item.category] += item.amount;
  });

  const sortedCategories = Object.entries(categoryMap).sort(
    (a, b) => b[1] - a[1]
  );

  const [topCategory, topCategoryAmount] = sortedCategories[0];
  const topCategoryRatio = topCategoryAmount / totalAmount;

  const foodRatio = categoryMap["식비"] / totalAmount;
  const transportRatio = categoryMap["교통"] / totalAmount;
  const housingRatio = categoryMap["주거"] / totalAmount;
  const telecomRatio = categoryMap["통신"] / totalAmount;
  const medicalRatio = categoryMap["의료"] / totalAmount;
  const cultureRatio = categoryMap["문화"] / totalAmount;
  const shoppingRatio = categoryMap["쇼핑"] / totalAmount;
  const savingRatio = categoryMap["저축"] / totalAmount;
  const etcRatio = categoryMap["기타"] / totalAmount;

  let type = "균형 소비형";
  let description = "특정 카테고리에 소비가 크게 치우치지 않은 안정적인 소비 패턴입니다.";
  let advice = "현재 소비 패턴을 유지하되, 목표 저축액을 먼저 설정해보세요.";

  if (savingRatio >= 0.3) {
    type = "저축 중심형";
    description = "전체 지출 중 저축 비중이 높아 미래 대비 성향이 강합니다.";
    advice = "저축을 유지하되, 생활비가 지나치게 부족하지 않은지 함께 점검해보세요.";
  } else if (housingRatio >= 0.4) {
    type = "주거비 부담형";
    description = "주거비 비중이 높아 다른 소비 여력이 줄어들 수 있습니다.";
    advice = "월세, 관리비 등 고정 주거비를 점검하고 예산 비중을 조정해보세요.";
  } else if (topCategoryRatio >= 0.5) {
    type = "편중 소비형";
    description = `${topCategory} 지출이 전체 소비의 절반 이상을 차지합니다.`;
    advice = `${topCategory} 소비를 20%만 줄여도 월 ${Math.round(
      topCategoryAmount * 0.2
    ).toLocaleString()}원을 절약할 수 있습니다.`;
  } else if (shoppingRatio + cultureRatio >= 0.4) {
    type = "여가·쇼핑 소비형";
    description = "쇼핑과 문화 소비 비중이 높아 선택적 소비가 많은 편입니다.";
    advice = "쇼핑과 문화생활 예산을 미리 정해두면 충동 소비를 줄일 수 있습니다.";
  } else if (foodRatio >= 0.35) {
    type = "식비 집중형";
    description = "식비 비중이 높아 외식이나 배달 소비가 많을 가능성이 있습니다.";
    advice = "외식·배달 횟수를 줄이고 주간 식비 한도를 설정해보세요.";
  } else if (telecomRatio >= 0.2) {
    type = "통신비 부담형";
    description = "통신비 비중이 상대적으로 높은 편입니다.";
    advice = "요금제, 구독 서비스, 부가서비스를 점검해 고정비를 줄여보세요.";
  } else if (medicalRatio >= 0.25) {
    type = "건강관리 지출형";
    description = "의료 관련 지출 비중이 높은 소비 패턴입니다.";
    advice = "반복적으로 발생하는 의료비가 있다면 월별 예산에 따로 반영해보세요.";
  } else if (transportRatio >= 0.25) {
    type = "이동비 부담형";
    description = "교통비 비중이 높아 이동 관련 지출이 많은 편입니다.";
    advice = "대중교통 정기권, 이동 경로 조정 등으로 교통비를 관리해보세요.";
  } else if (etcRatio >= 0.3) {
    type = "기타지출 관리필요형";
    description = "기타 항목 비중이 높아 소비 내역이 명확히 분류되지 않고 있습니다.";
    advice = "기타 지출을 더 구체적인 카테고리로 나누면 소비 분석 정확도가 올라갑니다.";
  } else if (totalAmount >= 1000000) {
    type = "과소비 위험형";
    description = "총 소비 금액이 높은 편입니다.";
    advice = "카테고리별 한도를 설정하고 주간 단위로 소비를 점검하는 것이 좋습니다.";
  }

  return {
    type,
    description,
    advice,
    totalAmount,
    topCategory,
    topCategoryAmount,
    topCategoryRatio: Math.round(topCategoryRatio * 100),
  };
}