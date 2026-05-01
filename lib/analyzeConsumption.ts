export type Expense = {
  id?: string;
  category: string;
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

  const categoryMap: Record<string, number> = {};

  expenses.forEach((item) => {
    categoryMap[item.category] =
      (categoryMap[item.category] || 0) + item.amount;
  });

  const sortedCategories = Object.entries(categoryMap).sort(
    (a, b) => b[1] - a[1]
  );

  const [topCategory, topCategoryAmount] = sortedCategories[0];
  const topCategoryRatio = topCategoryAmount / totalAmount;

  let type = "균형 소비형";
  let description = "특정 카테고리에 소비가 크게 치우치지 않았습니다.";
  let advice = "현재 소비 패턴을 유지하되, 목표 저축액을 먼저 설정해보세요.";

  if (topCategoryRatio >= 0.5) {
    type = "편중 소비형";
    description = `${topCategory} 지출 비중이 전체 소비의 절반 이상을 차지합니다.`;
    advice = `${topCategory} 소비를 20%만 줄여도 월 ${Math.round(
      topCategoryAmount * 0.2
    ).toLocaleString()}원을 절약할 수 있습니다.`;
  } else if (
    (topCategory.includes("카페") ||
      topCategory.includes("간식") ||
      topCategory.includes("쇼핑")) &&
    topCategoryRatio >= 0.3
  ) {
    type = "충동 소비형";
    description = `${topCategory} 관련 소비 비중이 높은 편입니다.`;
    advice = "소비 빈도를 줄이면 고정적인 절약 효과를 만들 수 있습니다.";
  } else if (
    (topCategory.includes("월세") ||
      topCategory.includes("보험") ||
      topCategory.includes("통신") ||
      topCategory.includes("구독")) &&
    topCategoryRatio >= 0.4
  ) {
    type = "고정지출 부담형";
    description = "고정지출 비중이 높아 생활비 여유가 줄어들 수 있습니다.";
    advice = "통신비, 구독료, 보험료처럼 조정 가능한 항목을 점검해보세요.";
  } else if (totalAmount >= 1000000) {
    type = "과소비 위험형";
    description = "월 소비 금액이 높은 편입니다.";
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