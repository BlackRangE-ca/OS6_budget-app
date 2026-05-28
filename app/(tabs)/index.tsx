import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { Transaction } from '../../types'
import { analyzeConsumptionType, Expense } from '../../lib/analyzeConsumption'
import { CATEGORY_COLORS } from '../../lib/constants'

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍚', 교통: '🚌', 주거: '🏠', 통신: '📱',
  의료: '💊', 문화: '🎬', 쇼핑: '🛍️', 저축: '💰', 기타: '📦',
}

export default function DashboardScreen() {
  const navigation = useNavigation() as any
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [budget, setBudget] = useState<number | null>(null)
  const [topCategories, setTopCategories] = useState<{ category: string; ratio: number }[]>([])
  const [consumptionType, setConsumptionType] = useState('')
  const [lastMonthDiff, setLastMonthDiff] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = lastMonthDate.toISOString().slice(0, 7)
  const monthLabel = `${now.getMonth() + 1}월`

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  )

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: txData }, { data: budgetData }, { data: lastTxData }] = await Promise.all([
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
      supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user!.id)
        .gte('date', `${lastMonth}-01`)
        .lte('date', `${lastMonth}-31`),
    ])

    if (txData) {
      setTransactions(txData)
      const total = txData.reduce((sum, t) => sum + t.amount, 0)
      setTotalAmount(total)

      const expenses: Expense[] = txData.map(t => ({ category: t.category, amount: t.amount }))
      const result = analyzeConsumptionType(expenses)
      setConsumptionType(result.type)

      if (total > 0) {
        const catMap: Record<string, number> = {}
        txData.forEach(t => { catMap[t.category] = (catMap[t.category] ?? 0) + t.amount })
        const sorted = Object.entries(catMap)
          .map(([category, amount]) => ({ category, ratio: Math.round(amount / total * 100) }))
          .sort((a, b) => b.ratio - a.ratio)
          .slice(0, 3)
        setTopCategories(sorted)
      }
    }

    setBudget(budgetData?.amount ?? null)

    if (lastTxData && lastTxData.length > 0) {
      const lastTotal = lastTxData.reduce((sum, t) => sum + t.amount, 0)
      const thisTotal = txData ? txData.reduce((sum, t) => sum + t.amount, 0) : 0
      if (lastTotal > 0) {
        setLastMonthDiff(Math.round((thisTotal - lastTotal) / lastTotal * 100))
      }
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    Alert.alert('삭제', '이 지출을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('transactions').delete().eq('id', id)
          if (error) {
            Alert.alert('오류', '삭제에 실패했습니다.')
          } else {
            const updated = transactions.filter(t => t.id !== id)
            setTransactions(updated)
            setTotalAmount(updated.reduce((sum, t) => sum + t.amount, 0))
          }
        },
      },
    ])
  }

  const usedRatio = budget ? Math.min(100, Math.round(totalAmount / budget * 100)) : 0
  const remaining = budget ? Math.max(0, budget - totalAmount) : null

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>오늘의 자산</Text>
          <Text style={styles.subtitle}>지출·저축·투자를 한눈에</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Add')}>
          <Ionicons name="add" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{monthLabel} 소비 요약</Text>
        <Text style={styles.consumptionType}>{consumptionType || '데이터 없음'}</Text>

        {lastMonthDiff !== null && (
          <Text style={[styles.trendText, { color: lastMonthDiff > 0 ? '#EF4444' : '#16A34A' }]}>
            지난달보다 지출 {Math.abs(lastMonthDiff)}% {lastMonthDiff > 0 ? '증가' : '감소'}
          </Text>
        )}

        {budget ? (
          <>
            <Text style={styles.trendText}>
              예산 대비 <Text style={{ color: usedRatio > 80 ? '#EF4444' : '#2563EB' }}>{usedRatio}% 사용</Text>
              {remaining !== null && `  ·  잔여 ${remaining.toLocaleString()}원`}
            </Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width: `${usedRatio}%` as any,
                backgroundColor: usedRatio > 80 ? '#EF4444' : '#2563EB',
              }]} />
            </View>
          </>
        ) : (
          <Text style={styles.trendText}>총 지출 {totalAmount.toLocaleString()}원</Text>
        )}

        {topCategories.length > 0 && (
          <View style={styles.pillRow}>
            {topCategories.map(({ category, ratio }) => (
              <View key={category} style={[styles.pill, { backgroundColor: (CATEGORY_COLORS[category] ?? '#2563EB') + '22' }]}>
                <Text style={[styles.pillText, { color: CATEGORY_COLORS[category] ?? '#2563EB' }]}>
                  {category} {ratio}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Salary' as any)}>
          <View style={styles.actionIcon}>
            <Ionicons name="cash-outline" size={24} color="#2563EB" />
          </View>
          <Text style={styles.actionTitle}>월급관리</Text>
          <Text style={styles.actionSub}>급여일/고정지출</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('자산' as never)}>
          <View style={styles.actionIcon}>
            <Ionicons name="wallet-outline" size={24} color="#2563EB" />
          </View>
          <Text style={styles.actionTitle}>자산 관리</Text>
          <Text style={styles.actionSub}>예산·목표</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('투자' as never)}>
          <View style={styles.actionIcon}>
            <Ionicons name="trending-up-outline" size={24} color="#2563EB" />
          </View>
          <Text style={styles.actionTitle}>투자</Text>
          <Text style={styles.actionSub}>추천·뉴스</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.goalCard} onPress={() => navigation.navigate('Goal')}>
        <View style={styles.goalIcon}>
          <Ionicons name="flag-outline" size={26} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>목표 설정</Text>
          <Text style={styles.goalSub}>재무 목표와 달성률을 관리해보세요</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>최근 지출</Text>
        {loading ? (
          <Text style={styles.empty}>불러오는 중...</Text>
        ) : transactions.length === 0 ? (
          <Text style={styles.empty}>아직 지출 내역이 없어요</Text>
        ) : (
          transactions.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txEmoji}>{CATEGORY_EMOJI[item.category] ?? '📦'}</Text>
                <View>
                  <Text style={styles.txMemo}>{item.memo || item.category}</Text>
                  <Text style={styles.txMeta}>{item.category} · {item.date}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, item.type === 'income' && { color: '#16A34A' }]}>
                  {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString()}원
                </Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => navigation.navigate('Edit', { transaction: item })} style={styles.editBtn}>
                    <Text style={styles.editText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 20 },
  cardLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  consumptionType: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  trendText: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  progressBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: 8, borderRadius: 4 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EFF6FF' },
  pillText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  actionGrid: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 12 },
  actionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center' },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  actionSub: { fontSize: 11, color: '#9CA3AF' },

  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 18,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  goalSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  empty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 16 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txEmoji: { fontSize: 24 },
  txMemo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  btnRow: { flexDirection: 'row', gap: 4 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#EFF6FF' },
  editText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#FEF2F2' },
  deleteText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
})