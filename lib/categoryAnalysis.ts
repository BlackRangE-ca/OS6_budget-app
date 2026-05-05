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

export type CategoryAnalysisResult = {
  category: ExpenseCategory;
  amount: number;
  ratio: number;
};

export function analyzeCategorySpending(
  expenses: Expense[]
): CategoryAnalysisResult[] {
  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

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

  return Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category: category as ExpenseCategory,
      amount,
      ratio: totalAmount === 0 ? 0 : Math.round((amount / totalAmount) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}