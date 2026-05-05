import { View, Text, StyleSheet } from "react-native";
import { analyzeConsumptionType, Expense } from "../../lib/analyzeConsumption";

const sampleExpenses: Expense[] = [
  { category: "식비", amount: 300000 },
  { category: "문화", amount: 150000 },
  { category: "쇼핑", amount: 200000 },
  { category: "교통", amount: 80000 },
];

export default function AnalysisScreen() {
  const result = analyzeConsumptionType(sampleExpenses);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>소비패턴 유형분류</Text>

      <View style={styles.card}>
        <Text style={styles.label}>나의 소비 유형</Text>
        <Text style={styles.type}>{result.type}</Text>

        <Text style={styles.text}>{result.description}</Text>

        <View style={styles.divider} />

        <Text style={styles.subTitle}>주요 소비 카테고리</Text>
        <Text style={styles.text}>
          {result.topCategory} / {result.topCategoryRatio}%
        </Text>

        <Text style={styles.subTitle}>총 소비 금액</Text>
        <Text style={styles.text}>
          {result.totalAmount.toLocaleString()}원
        </Text>

        <View style={styles.divider} />

        <Text style={styles.subTitle}>절약 조언</Text>
        <Text style={styles.advice}>{result.advice}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F8F9FA",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  type: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  advice: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 14,
  },
});