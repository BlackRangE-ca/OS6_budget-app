import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { getPeerComparison, fetchAgeGroupAssets, AGE_GROUPS, AGE_LABELS, AgeGroupAsset } from '../lib/kosisApi'
import { fetchTopETFs, ETFProduct } from '../lib/krxApi'

export default function PeerComparisonScreen() {
  const navigation = useNavigation() as any
  const [selectedAge, setSelectedAge] = useState(0)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [myAssetInput, setMyAssetInput] = useState('')
  const [mySavings, setMySavings] = useState(0)
  const [mySavingsRatio, setMySavingsRatio] = useState(0)
  const [ageData, setAgeData] = useState<AgeGroupAsset[]>([])
  const [etfs, setEtfs] = useState<ETFProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [peerFallback, setPeerFallback] = useState(false)
  const [etfFallback, setEtfFallback] = useState(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!loading) loadAgeData()
  }, [gender])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

    const [{ data: allTx }, { data: budgetData }, { data: monthTx }, ageGroupResult, etfResult] =
      await Promise.all([
        supabase.from('transactions').select('amount, category').eq('user_id', user!.id).eq('category', '저축'),
        supabase.from('budgets').select('salary').eq('user_id', user!.id).eq('month', thisMonth).single(),
        supabase.from('transactions').select('amount, category').eq('user_id', user!.id)
          .gte('date', `${thisMonth}-01`).lt('date', `${nextMonth}-01`),
        fetchAgeGroupAssets(gender),
        fetchTopETFs(),
      ])

    const totalSavings = (allTx ?? []).reduce((s, t) => s + t.amount, 0)
    const savingsManwon = Math.round(totalSavings / 10000)
    setMySavings(savingsManwon)
    setMyAssetInput(String(savingsManwon))

    if (budgetData?.salary && monthTx) {
      const ms = monthTx.filter(t => t.category === '저축').reduce((s, t) => s + t.amount, 0)
      setMySavingsRatio(ms / budgetData.salary)
    }

    setAgeData(ageGroupResult.data)
    setPeerFallback(ageGroupResult.isFallback)
    setEtfs(etfResult.data)
    setEtfFallback(etfResult.isFallback)
    setLoading(false)
  }

  async function loadAgeData() {
    const result = await fetchAgeGroupAssets(gender)
    setAgeData(result.data)
    setPeerFallback(result.isFallback)
  }

  const myAsset = parseInt(myAssetInput.replace(/,/g, ''), 10) || mySavings
  const currentAgeData = ageData[selectedAge]
  const peerData = currentAgeData
    ? getPeerComparison(selectedAge, gender, myAsset, mySavingsRatio)
    : null

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>또래 비교</Text>
          <Text style={styles.subtitle}>통계청 2023 가계금융복지조사 기준</Text>
        </View>
      </View>

      {/* 성별 선택 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>성별</Text>
        <View style={styles.toggleRow}>
          {(['male', 'female'] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.toggleBtn, gender === g && styles.toggleBtnActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.toggleText, gender === g && styles.toggleTextActive]}>
                {g === 'male' ? '남성' : '여성'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 연령대 선택 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>연령대</Text>
        <Text style={styles.hint}>사회초년생 기준으로 구분했어요</Text>
        {AGE_GROUPS.map((g, i) => (
          <TouchableOpacity
            key={g}
            style={[styles.ageRow, selectedAge === i && styles.ageRowActive]}
            onPress={() => setSelectedAge(i)}
          >
            <View>
              <Text style={[styles.ageLabel, selectedAge === i && styles.ageLabelActive]}>{g}</Text>
              <Text style={styles.ageDesc}>{AGE_LABELS[g]}</Text>
            </View>
            {selectedAge === i && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* 내 자산 입력 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>내 총 금융자산</Text>
        <Text style={styles.hint}>앱에 입력한 저축 누적액 기준 · 직접 수정 가능해요</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={myAssetInput}
            onChangeText={setMyAssetInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.inputUnit}>만원</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* 또래 평균 비교 */}
          {peerData && currentAgeData && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {AGE_GROUPS[selectedAge]} {gender === 'male' ? '남성' : '여성'} 비교
              </Text>
              {peerFallback && (
                <View style={styles.fallbackBanner}>
                  <Ionicons name="warning-outline" size={13} color="#D97706" />
                  <Text style={styles.fallbackText}>서버 연결 실패 · 참고값으로 표시 중</Text>
                </View>
              )}

              <View style={styles.compareRow}>
                <View style={styles.compareBox}>
                  <Text style={styles.compareLabel}>또래 평균</Text>
                  <Text style={styles.compareValue}>{currentAgeData.totalAsset.toLocaleString()}</Text>
                  <Text style={styles.compareUnit}>만원</Text>
                </View>
                <View style={styles.vsBox}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={styles.compareBox}>
                  <Text style={styles.compareLabel}>나</Text>
                  <Text style={[styles.compareValue, { color: myAsset >= currentAgeData.totalAsset ? '#16A34A' : '#2563EB' }]}>
                    {myAsset.toLocaleString()}
                  </Text>
                  <Text style={styles.compareUnit}>만원</Text>
                </View>
              </View>

              <View style={styles.diffBadge}>
                {myAsset >= currentAgeData.totalAsset ? (
                  <Text style={[styles.diffText, { color: '#16A34A' }]}>
                    또래 평균보다 {(myAsset - currentAgeData.totalAsset).toLocaleString()}만원 많아요 🎉
                  </Text>
                ) : (
                  <Text style={[styles.diffText, { color: '#EF4444' }]}>
                    또래 평균보다 {(currentAgeData.totalAsset - myAsset).toLocaleString()}만원 적어요
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* 자산 구성 비율 */}
          {currentAgeData && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>또래 평균 자산 구성</Text>
              {[
                { label: '예·적금', value: currentAgeData.deposit, color: '#2563EB' },
                { label: '주식·펀드', value: currentAgeData.stock, color: '#7C3AED' },
                { label: '보험·연금', value: currentAgeData.insurance, color: '#059669' },
                { label: '기타', value: currentAgeData.other, color: '#D97706' },
              ].map(item => (
                <View key={item.label} style={styles.barRow}>
                  <Text style={styles.barLabel}>{item.label}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${item.value}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.barPct}>{item.value}%</Text>
                </View>
              ))}
            </View>
          )}

          {/* 맞춤 조언 */}
          {peerData && (
            <View style={[styles.card, styles.adviceCard]}>
              <View style={styles.adviceHeader}>
                <Ionicons name="bulb-outline" size={20} color="#2563EB" />
                <Text style={styles.adviceTitle}>맞춤 조언</Text>
              </View>
              <Text style={styles.adviceText}>{peerData.advice}</Text>
              {peerData.popularProducts.length > 0 && (
                <>
                  <Text style={styles.popularTitle}>또래가 많이 투자하는 자산</Text>
                  {peerData.popularProducts.map((p, i) => (
                    <View key={i} style={styles.popularItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                      <Text style={styles.popularText}>{p}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* 인기 ETF */}
          {etfs.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>순자산 상위 ETF</Text>
              <Text style={styles.hint}>KRX 데이터 기준</Text>
              {etfFallback && (
                <View style={styles.fallbackBanner}>
                  <Ionicons name="warning-outline" size={13} color="#D97706" />
                  <Text style={styles.fallbackText}>서버 연결 실패 · 참고값으로 표시 중</Text>
                </View>
              )}
              {etfs.slice(0, 5).map(etf => (
                <View key={etf.id} style={styles.etfRow}>
                  <View style={styles.etfLeft}>
                    <Text style={styles.etfName}>{etf.name}</Text>
                    <Text style={styles.etfMeta}>{etf.category} · {etf.aum.toLocaleString()}억원</Text>
                  </View>
                  <View style={styles.etfRight}>
                    <Text style={styles.etfPrice}>{etf.price.toLocaleString()}원</Text>
                    <Text style={[styles.etfChange, { color: etf.change >= 0 ? '#EF4444' : '#2563EB' }]}>
                      {etf.change >= 0 ? '+' : ''}{etf.change}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 60 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#2563EB' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
  ageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6, backgroundColor: '#F9FAFB' },
  ageRowActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  ageLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  ageLabelActive: { color: '#2563EB' },
  ageDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' },
  inputUnit: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  compareBox: { flex: 1, alignItems: 'center' },
  compareLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  compareValue: { fontSize: 28, fontWeight: '800', color: '#111827' },
  compareUnit: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  vsBox: { paddingHorizontal: 12 },
  vsText: { fontSize: 14, fontWeight: '700', color: '#D1D5DB' },
  diffBadge: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, alignItems: 'center' },
  diffText: { fontSize: 14, fontWeight: '600' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 60, fontSize: 12, color: '#6B7280' },
  barBg: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barPct: { width: 36, fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'right' },
  adviceCard: { backgroundColor: '#EFF6FF' },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  adviceTitle: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  adviceText: { fontSize: 14, color: '#1E40AF', lineHeight: 22, marginBottom: 14 },
  popularTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  popularItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  popularText: { fontSize: 13, color: '#374151' },
  fallbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
  fallbackText: { fontSize: 12, color: '#D97706', fontWeight: '500' as const, flex: 1 },
  etfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  etfLeft: { flex: 1 },
  etfName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  etfMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  etfRight: { alignItems: 'flex-end' },
  etfPrice: { fontSize: 14, fontWeight: '600', color: '#111827' },
  etfChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
})
