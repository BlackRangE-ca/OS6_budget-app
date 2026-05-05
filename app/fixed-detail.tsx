import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Transaction } from '../types'
import { CATEGORY_COLORS } from '../lib/constants'

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일']

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const startOffset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export default function FixedDetailScreen() {
  const navigation = useNavigation() as any
  const [fixedTx, setFixedTx] = useState<Transaction[]>([])
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [showAll, setShowAll] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date())

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  useFocusEffect(useCallback(() => { fetchData() }, [monthStr]))

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('transactions').select('*')
      .eq('user_id', user!.id)
      .gte('date', `${monthStr}-01`)
      .lte('date', `${monthStr}-31`)
      .order('date', { ascending: true })
    if (data) {
      setFixedTx(data.filter(t => t.type === 'fixed'))
      setAllTx(data)
    }
  }

  const calDays = getCalendarDays(year, month)
  const txByDay: Record<number, { total: number; hasIncome: boolean }> = {}
  allTx.forEach(t => {
    const d = parseInt(t.date.split('-')[2])
    if (!txByDay[d]) txByDay[d] = { total: 0, hasIncome: false }
    if (t.type === 'income') {
      txByDay[d].hasIncome = true
      txByDay[d].total += t.amount
    } else {
      txByDay[d].total -= t.amount
    }
  })

  const displayed = showAll ? fixedTx : fixedTx.slice(0, 3)

  function changeMonth(delta: number) {
    const d = new Date(viewMonth)
    d.setMonth(d.getMonth() + delta)
    setViewMonth(d)
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>고정 지출 상세</Text>
          <Text style={styles.subtitle}>월별 지출 내역과 소비 패턴</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 고정 지출 테이블 */}
      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHead, { flex: 1.2 }]}>지출명</Text>
          <Text style={[styles.tableHead, { flex: 1.2, textAlign: 'center' }]}>금액</Text>
          <Text style={[styles.tableHead, { flex: 0.8, textAlign: 'right' }]}>카테고리</Text>
        </View>
        {displayed.length === 0 ? (
          <Text style={styles.empty}>고정 지출이 없어요</Text>
        ) : (
          displayed.map(t => (
            <View key={t.id} style={styles.tableRow}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.txName}>{t.memo || t.category}</Text>
                <Text style={styles.txSub}>{t.category}</Text>
              </View>
              <Text style={[styles.txAmount, { flex: 1.2, textAlign: 'center' }]}>
                {t.amount.toLocaleString()}원
              </Text>
              <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                <View style={[styles.catPill, { backgroundColor: (CATEGORY_COLORS[t.category] ?? '#9CA3AF') + '22' }]}>
                  <Text style={[styles.catPillText, { color: CATEGORY_COLORS[t.category] ?? '#9CA3AF' }]}>{t.category}</Text>
                </View>
              </View>
            </View>
          ))
        )}
        {fixedTx.length > 3 && (
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowAll(!showAll)}>
            <Text style={styles.moreBtnText}>{showAll ? '접기' : '더보기'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 월 네비게이션 */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{month}월</Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 달력 */}
      <View style={styles.card}>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map(d => (
            <Text key={d} style={styles.weekDay}>{d}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>
          {calDays.map((day, i) => (
            <View key={i} style={styles.calCell}>
              {day !== null && (
                <>
                  <Text style={[styles.dayNum, txByDay[day]?.hasIncome && styles.dayNumIncome]}>
                    {day}
                  </Text>
                  {txByDay[day] && (
                    <Text style={[styles.calAmount, { color: txByDay[day].total >= 0 ? '#16A34A' : '#EF4444' }]}>
                      {txByDay[day].total >= 0 ? '+' : ''}
                      {Math.abs(txByDay[day].total) >= 10000
                        ? `${(Math.abs(txByDay[day].total) / 10000).toFixed(0)}만`
                        : Math.abs(txByDay[day].total).toLocaleString()}
                    </Text>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 분석 배너 */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>이번 달 소비 흐름을 분석해볼까요?</Text>
          <Text style={styles.bannerSub}>카테고리별 증감과 한달 소비 그래프로 이동</Text>
        </View>
        <TouchableOpacity style={styles.bannerBtn} onPress={() => navigation.navigate('자산' as any)}>
          <Text style={styles.bannerBtnText}>분석하기</Text>
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
  card: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 16 },
  tableHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 4 },
  tableHead: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catPillText: { fontSize: 12, fontWeight: '600' },
  moreBtn: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  moreBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  empty: { color: '#9CA3AF', fontSize: 14, paddingVertical: 12 },
  monthNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginVertical: 8 },
  monthText: { fontSize: 20, fontWeight: '700', color: '#111827' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', minHeight: 52, padding: 2, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  dayNum: { fontSize: 12, fontWeight: '600', color: '#374151' },
  dayNumIncome: { color: '#2563EB' },
  payDay: { fontSize: 10, color: '#2563EB' },
  calAmount: { fontSize: 10, fontWeight: '500', lineHeight: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, padding: 16, gap: 12 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  bannerSub: { fontSize: 12, color: '#9CA3AF' },
  bannerBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bannerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
