import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { analyzeConsumptionType, Expense } from "../../lib/analyzeConsumption";
import { analyzeCategorySpending } from "../../lib/categoryAnalysis";
import { supabase } from "../../lib/supabase";

export default function AnalysisScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [])
  );

  async function fetchExpenses() {
    const { data: { user } } = await supabase.auth.getUser();
    const thisMonth = new Date().toISOString().slice(0, 7);

    const { data } = await supabase
      .from("transactions")
      .select("category, amount")
      .eq("user_id", user!.id)
      .gte("date", `${thisMonth}-01`)
      .lte("date", `${thisMonth}-31`);

    if (data) setExpenses(data as Expense[]);
  }

  const result = analyzeConsumptionType(expenses);
  const categoryResult = analyzeCategorySpending(expenses);

  return (
    <ScrollView style={styles.container}>
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
        <View style={styles.divider} />

<Text style={styles.subTitle}>카테고리별 소비 분석</Text>

{categoryResult.map((item) => (
  <View key={item.category} style={styles.categoryRow}>
    <Text style={styles.categoryName}>{item.category}</Text>
    <Text style={styles.categoryAmount}>
      {item.amount.toLocaleString()}원 / {item.ratio}%
    </Text>
  </View>
))}
      </View>
    </ScrollView>
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
  categoryRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
},
categoryName: {
  fontSize: 15,
  fontWeight: "600",
  color: "#333",
},
categoryAmount: {
  fontSize: 15,
  color: "#666",
},
});