import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Transaction } from '../types'

const CATEGORIES = ['주거', '통신', '교통', '식비', '의료', '문화', '쇼핑', '기타']

type FixedTemplate = {
  id: string
  category: string
  memo: string | null
  amount: number
}

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

  const [templates, setTemplates] = useState<FixedTemplate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formCategory, setFormCategory] = useState('주거')
  const [formMemo, setFormMemo] = useState('')
  const [formAmount, setFormAmount] = useState('')

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  useFocusEffect(useCallback(() => { fetchData() }, []))

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: budgetData }, { data: txData }, { data: tplData }] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user!.id).eq('month', thisMonth).single(),
      supabase.from('transactions').select('*')
        .eq('user_id', user!.id)
        .gte('date', `${thisMonth}-01`)
        .lt('date', `${nextMonth}-01`)
        .order('date', { ascending: false }),
      supabase.from('fixed_templates').select('*').eq('user_id', user!.id).order('created_at'),
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
    if (tplData) setTemplates(tplData)
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

  async function handleAddTemplate() {
    const rawAmt = parseNumber(formAmount)
    if (!rawAmt) return Alert.alert('오류', '금액을 입력해주세요.')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('fixed_templates').insert({
      user_id: user!.id,
      category: formCategory,
      memo: formMemo || null,
      amount: Number(rawAmt),
    })
    if (error) { Alert.alert('오류', '추가에 실패했습니다.'); return }
    setShowForm(false)
    setFormMemo('')
    setFormAmount('')
    setFormCategory('주거')
    fetchData()
  }

  async function handleDeleteTemplate(id: string) {
    Alert.alert('삭제', '고정비 항목을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await supabase.from('fixed_templates').delete().eq('id', id)
          fetchData()
        },
      },
    ])
  }

  async function handleApplyThisMonth() {
    if (templates.length === 0) return
    const list = templates.map(t => `${t.memo || t.category} ${t.amount.toLocaleString()}원`).join('\n')
    Alert.alert(
      `이번 달 고정비 ${templates.length}건 적용`,
      `아래 항목을 이번 달 지출에 추가할게요:\n\n${list}`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '적용하기',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            const rows = templates.map(t => ({
              user_id: user!.id,
              category: t.category,
              memo: t.memo,
              amount: t.amount,
              type: 'fixed',
              date: todayStr,
            }))
            const { error } = await supabase.from('transactions').insert(rows)
            if (error) Alert.alert('오류', '적용에 실패했습니다.')
            else { Alert.alert('완료', '이번 달 고정비가 추가됐어요.'); fetchData() }
          },
        },
      ]
    )
  }

  const totalFixed = fixedTx.reduce((s, t) => s + t.amount, 0)
  const totalTemplates = templates.reduce((s, t) => s + t.amount, 0)

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

      {/* 고정비 템플릿 */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>고정비 템플릿</Text>
            <Text style={styles.sectionSub}>매달 반복되는 지출 목록</Text>
          </View>
          <TouchableOpacity style={styles.plusBtn} onPress={() => setShowForm(v => !v)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* 추가 폼 */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formLabel}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.catPills}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, formCategory === cat && styles.catPillActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.catPillText, formCategory === cat && styles.catPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={styles.formInput}
              value={formMemo}
              onChangeText={setFormMemo}
              placeholder="항목명 (예: 월세, 넷플릭스)"
            />
            <View style={styles.formAmtRow}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={formAmount}
                onChangeText={v => setFormAmount(formatNumber(v))}
                keyboardType="numeric"
                placeholder="금액"
              />
              <Text style={styles.unit}>원</Text>
            </View>
            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.formCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formAddBtn} onPress={handleAddTemplate}>
                <Text style={styles.formAddText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 템플릿 목록 */}
        {templates.length === 0 ? (
          <Text style={styles.empty}>등록된 고정비가 없어요{'\n'}+ 버튼으로 추가해보세요</Text>
        ) : (
          <>
            {templates.map(t => (
              <View key={t.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txName}>{t.memo || t.category}</Text>
                  <Text style={styles.txCategory}>{t.category}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>{t.amount.toLocaleString()}원</Text>
                  <TouchableOpacity onPress={() => handleDeleteTemplate(t.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>월 고정비 합계</Text>
              <Text style={styles.totalAmount}>{totalTemplates.toLocaleString()}원</Text>
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyThisMonth}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.applyBtnText}>이번 달 고정비 {templates.length}건 적용하기</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 이번달 적용된 고정비 */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>이번 달 고정비</Text>
        </View>
        {fixedTx.length === 0 ? (
          <Text style={styles.empty}>아직 적용된 고정비가 없어요</Text>
        ) : (
          <>
            {fixedTx.map(t => (
              <View key={t.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txName}>{t.memo || t.category}</Text>
                  <Text style={styles.txCategory}>{t.category} · {t.date}</Text>
                </View>
                <Text style={styles.txAmount}>{t.amount.toLocaleString()}원</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>합계</Text>
              <Text style={styles.totalAmount}>{totalFixed.toLocaleString()}원</Text>
            </View>
          </>
        )}
      </View>

      {/* 최근 지출 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>변동 지출</Text>
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  plusBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  form: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 12 },
  formLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  catPills: { flexDirection: 'row', gap: 6 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  catPillActive: { backgroundColor: '#2563EB' },
  catPillText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  catPillTextActive: { color: '#fff' },
  formInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  formAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  formCancelBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  formCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  formAddBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center' },
  formAddText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  txLeft: { flex: 1 },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  totalAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563EB', borderRadius: 12, padding: 14, marginTop: 12 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { color: '#9CA3AF', fontSize: 14, paddingVertical: 12, lineHeight: 22 },
  moreBtn: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  moreBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
})
