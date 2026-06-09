import { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Transaction } from '../types'
import { CATEGORY_COLORS } from '../lib/constants'

const CATEGORY_EMOJI: Record<string, string> = {
  식비: '🍚', 교통: '🚌', 주거: '🏠', 통신: '📱',
  의료: '💊', 문화: '🎬', 쇼핑: '🛍️', 저축: '💰', 기타: '📦', 수입: '💵',
}

function getMonthStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return getMonthStr(d)
}

export default function AllTransactionsScreen() {
  const navigation = useNavigation() as any
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const currentMonth = getMonthStr(new Date())
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useFocusEffect(useCallback(() => { fetchData(selectedMonth) }, [selectedMonth]))

  async function fetchData(month: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('transactions').select('*')
      .eq('user_id', user!.id)
      .gte('date', `${month}-01`)
      .lt('date', `${shiftMonth(month, 1)}-01`)
      .order('date', { ascending: false })
    if (data) {
      setTransactions(data)
      setTotalSpent(data.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0))
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('삭제', '이 지출을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('transactions').delete().eq('id', id)
          if (!error) setTransactions(prev => {
            const updated = prev.filter(t => t.id !== id)
            setTotalSpent(updated.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0))
            return updated
          })
        },
      },
    ])
  }

  const [y, m] = selectedMonth.split('-')
  const monthLabel = `${y}년 ${parseInt(m)}월`
  const isCurrentMonth = selectedMonth === currentMonth

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>전체 지출 내역</Text>
          <Text style={styles.subtitle}>{monthLabel} · 총 {totalSpent.toLocaleString()}원</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 월 선택기 */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          onPress={() => !isCurrentMonth && setSelectedMonth(shiftMonth(selectedMonth, 1))}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={18} color={isCurrentMonth ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>지출 내역이 없어요</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.emoji}>{CATEGORY_EMOJI[item.category] ?? '📦'}</Text>
              <View>
                <Text style={styles.memo}>{item.memo || item.category}</Text>
                <Text style={styles.meta}>{item.category} · {item.date}</Text>
              </View>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.amount, item.type === 'income' && { color: '#16A34A' }]}>
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
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12 },
  monthArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  monthArrowDisabled: { opacity: 0.4 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 100, textAlign: 'center' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginBottom: 8, padding: 16, borderRadius: 16 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 24 },
  memo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  btnRow: { flexDirection: 'row', gap: 4 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#EFF6FF' },
  editText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#FEF2F2' },
  deleteText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
})
