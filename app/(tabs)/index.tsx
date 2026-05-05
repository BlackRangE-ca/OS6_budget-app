import { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Transaction } from '../../types'

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [budget, setBudget] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  )

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    const thisMonth = new Date().toISOString().slice(0, 7)

    const [{ data: txData, error }, { data: budgetData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', `${thisMonth}-01`)
        .lte('date', `${thisMonth}-31`)
        .order('date', { ascending: false }),
      supabase
        .from('budgets')
        .select('amount')
        .eq('user_id', user!.id)
        .eq('month', thisMonth)
        .single(),
    ])

    if (!error && txData) {
      setTransactions(txData)
      setTotalAmount(txData.reduce((sum, t) => sum + t.amount, 0))
    }
    setBudget(budgetData?.amount ?? null)
    setLoading(false)
}

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const CATEGORY_EMOJI: Record<string, string> = {
    식비: '🍚', 교통: '🚌', 주거: '🏠', 통신: '📱',
    의료: '💊', 문화: '🎬', 쇼핑: '🛍️', 저축: '💰', 기타: '📦',
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>이번 달 지출</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>총 지출</Text>
        <Text style={styles.summaryAmount}>{totalAmount.toLocaleString()}원</Text>
        {budget && (
          <>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>예산 {budget.toLocaleString()}원</Text>
              <Text style={styles.budgetLabel}>남은 금액 {Math.max(0, budget - totalAmount).toLocaleString()}원</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${Math.min(100, Math.round(totalAmount / budget * 100))}%` as any,
                backgroundColor: totalAmount > budget ? '#ff6b6b' : '#a5b4fc',
              }]} />
            </View>
            <Text style={styles.progressText}>{Math.min(100, Math.round(totalAmount / budget * 100))}% 사용</Text>
          </>
        )}
      </View>

      {loading ? (
        <Text style={styles.empty}>불러오는 중...</Text>
      ) : transactions.length === 0 ? (
        <Text style={styles.empty}>아직 지출 내역이 없어요</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.emoji}>{CATEGORY_EMOJI[item.category] ?? '📦'}</Text>
                <View>
                  <Text style={styles.category}>{item.category}</Text>
                  <Text style={styles.meta}>
                    {item.type === 'fixed' ? '고정' : '변동'} · {item.date}
                  </Text>
                  {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}
                </View>
              </View>
              <Text style={styles.amount}>-{item.amount.toLocaleString()}원</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8ff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  logout: { fontSize: 13, color: '#aaa' },
  summaryCard: { margin: 16, backgroundColor: '#4f46e5', borderRadius: 16, padding: 24 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 12 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  category: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  meta: { fontSize: 12, color: '#aaa', marginTop: 2 },
  memo: { fontSize: 12, color: '#888', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '600', color: '#e53e3e' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  budgetLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
})
