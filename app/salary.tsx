import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Transaction } from '../types'

function formatNumber(value: string) {
  const num = value.replace(/[^0-9]/g, '')
  return num ? Number(num).toLocaleString() : ''
}
function parseNumber(value: string) {
  return value.replace(/,/g, '')
}

export default function SalaryScreen() {
  const navigation = useNavigation() as any
  const [salary, setSalary] = useState('')
  const [payday, setPayday] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [fixedTx, setFixedTx] = useState<Transaction[]>([])
  const [variableTx, setVariableTx] = useState<Transaction[]>([])
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  )

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: budgetData }, { data: txData }] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user!.id).eq('month', thisMonth).single(),
      supabase.from('transactions').select('*')
        .eq('user_id', user!.id)
        .gte('date', `${thisMonth}-01`)
        .lt('date', `${nextMonth}-01`)
        .order('date', { ascending: false }),
    ])

    if (budgetData) {
      setSalary(budgetData.salary ? budgetData.salary.toLocaleString() : '')
      setPayday(budgetData.payday ? String(budgetData.payday) : '')
      setBudgetAmount(budgetData.amount ? budgetData.amount.toLocaleString() : '')
    }
    if (txData) {
      setFixedTx(txData.filter(t => t.type === 'fixed'))
      setVariableTx(txData.filter(t => t.type === 'variable').slice(0, 5))
    }
  }

  const rawSalaryNum = Number(parseNumber(salary))
  const autoBudget = rawSalaryNum > 0 && !parseNumber(budgetAmount)
    ? Math.round(rawSalaryNum * 0.7)
    : null

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const rawSalary = parseNumber(salary)
    const rawBudget = parseNumber(budgetAmount)
    const effectiveBudget = rawBudget
      ? Number(rawBudget)
      : (rawSalary ? Math.round(Number(rawSalary) * 0.7) : null)
    const { error } = await supabase.from('budgets').upsert({
      user_id: user!.id,
      month: thisMonth,
      salary: rawSalary ? Number(rawSalary) : null,
      payday: payday ? Number(payday) : null,
      amount: effectiveBudget,
    }, { onConflict: 'user_id,month' })
    if (error) Alert.alert('오류', '저장에 실패했습니다.')
    else Alert.alert('완료', '저장됐습니다.')
    setSaving(false)
  }

  const totalFixed = fixedTx.reduce((s, t) => s + t.amount, 0)

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>월급 관리</Text>
          <Text style={styles.subtitle}>월급일과 고정 지출을 관리해요</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 월급 카드 */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>월급</Text>
          <TextInput
            style={styles.fieldInput}
            value={salary}
            onChangeText={v => setSalary(formatNumber(v))}
            keyboardType="numeric"
            placeholder="금액 입력"
          />
          <Text style={styles.unit}>원</Text>
        </View>
        <Text style={styles.fieldHint}>세금 제외 후 실제 받는 월 수령액</Text>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>예산</Text>
          <TextInput
            style={styles.fieldInput}
            value={budgetAmount}
            onChangeText={v => setBudgetAmount(formatNumber(v))}
            keyboardType="numeric"
            placeholder="이번 달 소비 한도"
          />
          <Text style={styles.unit}>원</Text>
        </View>
        {autoBudget ? (
          <Text style={styles.autoHint}>
            입력하지 않으면 월급의 70%인 {autoBudget.toLocaleString()}원이 자동 적용돼요
          </Text>
        ) : (
          <Text style={styles.fieldHint}>이번 달 쓸 수 있는 최대 금액 (소비 진행률에 반영)</Text>
        )}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>급여일</Text>
          <Text style={styles.fieldValue}>매달</Text>
          <TextInput
            style={[styles.fieldInput, { width: 50, textAlign: 'center' }]}
            value={payday}
            onChangeText={v => setPayday(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="25"
            maxLength={2}
          />
          <Text style={styles.unit}>일</Text>
        </View>
        <Text style={styles.fieldHint}>다음 급여일까지 남은 일수를 계산하는 데 사용돼요</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장하기'}</Text>
        </TouchableOpacity>
      </View>

      {/* 고정 지출 */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>고정 지출</Text>
          <TouchableOpacity style={styles.plusBtn} onPress={() => navigation.navigate('Add')}>
            <Ionicons name="add" size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>
        {fixedTx.length === 0 ? (
          <Text style={styles.empty}>고정 지출이 없어요</Text>
        ) : (
          fixedTx.map(t => (
            <View key={t.id} style={styles.txRow}>
              <View>
                <Text style={styles.txName}>{t.memo || t.category}</Text>
                <Text style={styles.txCategory}>{t.category}</Text>
              </View>
              <Text style={styles.txAmount}>{t.amount.toLocaleString()}원</Text>
            </View>
          ))
        )}
        {fixedTx.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalAmount}>{totalFixed.toLocaleString()}원</Text>
          </View>
        )}
        <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('FixedDetail')}>
          <Text style={styles.moreBtnText}>전체 내역 보기</Text>
        </TouchableOpacity>
      </View>

      {/* 최근 지출 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>지출</Text>
        {variableTx.length === 0 ? (
          <Text style={styles.empty}>지출 내역이 없어요</Text>
        ) : (
          variableTx.map(t => (
            <View key={t.id} style={styles.txRow}>
              <Text style={styles.txName}>{t.memo || t.category}</Text>
              <Text style={styles.txAmount}>{t.amount.toLocaleString()}원</Text>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('AllTransactions')}>
          <Text style={styles.moreBtnText}>전체 내역 보기</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#111827', width: 48 },
  fieldValue: { fontSize: 15, color: '#6B7280' },
  fieldInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  unit: { fontSize: 14, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  fieldHint: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, marginLeft: 4 },
  autoHint: { fontSize: 12, color: '#2563EB', marginBottom: 4, marginLeft: 4, fontWeight: '500' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  plusBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  totalAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  empty: { color: '#9CA3AF', fontSize: 14, paddingVertical: 12 },
  moreBtn: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  moreBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
})
