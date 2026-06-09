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
  const [peerFallbackReason, setPeerFallbackReason] = useState<'no_key' | 'error' | undefined>()
  const [etfFallback, setEtfFallback] = useState(false)
  const [etfFallbackReason, setEtfFallbackReason] = useState<'no_key' | 'error' | undefined>()
  const [myAssetComp, setMyAssetComp] = useState<{ depositTotal: number; stock: number; insurance: number; other: number } | null>(null)

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

    const [{ data: allTx }, { data: budgetData }, { data: monthTx }, { data: userAssets }, ageGroupResult, etfResult] =
      await Promise.all([
        supabase.from('transactions').select('amount, category').eq('user_id', user!.id).eq('category', '저축'),
        supabase.from('budgets').select('salary').eq('user_id', user!.id).eq('month', thisMonth).single(),
        supabase.from('transactions').select('amount, category').eq('user_id', user!.id)
          .gte('date', `${thisMonth}-01`).lt('date', `${nextMonth}-01`),
        supabase.from('user_assets').select('deposit,savings,stock,insurance,other').eq('user_id', user!.id).single(),
        fetchAgeGroupAssets(gender),
        fetchTopETFs(),
      ])

    // user_assets 총합이 있으면 우선 사용, 없으면 저축 거래내역 합계로 추정
    const assetTotal = userAssets
      ? ((userAssets.deposit ?? 0) + (userAssets.stock ?? 0) + (userAssets.insurance ?? 0) + (userAssets.other ?? 0))
      : 0
    const savingsTotal = (allTx ?? []).reduce((s, t) => s + t.amount, 0)
    const baseAmount = assetTotal > 0 ? assetTotal : savingsTotal
    const baseManwon = Math.round(baseAmount / 10000)
    setMySavings(baseManwon)
    setMyAssetInput(String(baseManwon))

    if (budgetData?.salary && monthTx) {
      const ms = monthTx.filter(t => t.category === '저축').reduce((s, t) => s + t.amount, 0)
      setMySavingsRatio(ms / budgetData.salary)
    }

    if (userAssets) {
      const depositTotal = (userAssets.deposit ?? 0) + (userAssets.savings ?? 0)
      const t = depositTotal + (userAssets.stock ?? 0) + (userAssets.insurance ?? 0) + (userAssets.other ?? 0)
      if (t > 0) {
        setMyAssetComp({
          depositTotal: Math.round(depositTotal / t * 100),
          stock:        Math.round((userAssets.stock     ?? 0) / t * 100),
          insurance:    Math.round((userAssets.insurance ?? 0) / t * 100),
          other:        Math.round((userAssets.other     ?? 0) / t * 100),
        })
      }
    }

    setAgeData(ageGroupResult.data)
    setPeerFallback(ageGroupResult.isFallback)
    setPeerFallbackReason(ageGroupResult.fallbackReason)
    setEtfs(etfResult.data)
    setEtfFallback(etfResult.isFallback)
    setEtfFallbackReason(etfResult.fallbackReason)
    setLoading(false)
  }

  async function loadAgeData() {
    const result = await fetchAgeGroupAssets(gender)
    setAgeData(result.data)
    setPeerFallback(result.isFallback)
    setPeerFallbackReason(result.fallbackReason)
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
                  <Ionicons name="construct-outline" size={13} color="#D97706" />
                  <Text style={styles.fallbackText}>
                    API 연동 작업 중 · 통계청 2023 가계금융복지조사 기준값으로 표시
                  </Text>
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

          {/* 자산 구성 비교 */}
          {currentAgeData && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>자산 구성 비교</Text>
              <Text style={styles.hint}>
                {myAssetComp ? '내 구성 vs 또래 평균' : '또래 평균 구성 (자산 탭에서 내 자산 입력 시 비교 가능)'}
              </Text>

              {/* 헤더 — 데이터 행과 동일한 구조로 정렬 보장 */}
              <View style={[styles.compRow, { marginBottom: 4 }]}>
                <View style={[styles.compDot, { backgroundColor: 'transparent' }]} />
                <Text style={[styles.compLabel, { color: 'transparent' }]}>placeholder</Text>
                <View style={[styles.compBarGroup, { alignItems: 'center' }]}>
                  <Text style={styles.compColHead}>나</Text>
                </View>
                <View style={[styles.compBarGroup, { alignItems: 'center' }]}>
                  <Text style={styles.compColHead}>또래</Text>
                </View>
                <View style={{ width: 34 }} />
              </View>

              {[
                { label: '예·적금',   myPct: myAssetComp?.depositTotal, peerPct: currentAgeData.deposit,   color: '#2563EB' },
                { label: '주식·ETF',  myPct: myAssetComp?.stock,     peerPct: currentAgeData.stock,     color: '#7C3AED' },
                { label: '보험·연금', myPct: myAssetComp?.insurance,  peerPct: currentAgeData.insurance, color: '#16A34A' },
                { label: '기타',      myPct: myAssetComp?.other,      peerPct: currentAgeData.other,     color: '#D97706' },
              ].map(({ label, myPct, peerPct, color }) => {
                const diff = myPct != null ? myPct - peerPct : null
                return (
                  <View key={label} style={styles.compRow}>
                    <View style={[styles.compDot, { backgroundColor: color }]} />
                    <Text style={styles.compLabel}>{label}</Text>

                    <View style={styles.compBarGroup}>
                      {myPct != null ? (
                        <>
                          <View style={styles.compBarBg}>
                            <View style={[styles.compBarFill, { width: `${myPct}%` as any, backgroundColor: color }]} />
                          </View>
                          <Text style={styles.compPct}>{myPct}%</Text>
                        </>
                      ) : (
                        <Text style={styles.compPctEmpty}>-</Text>
                      )}
                    </View>

                    <View style={styles.compBarGroup}>
                      <View style={styles.compBarBg}>
                        <View style={[styles.compBarFill, { width: `${peerPct}%` as any, backgroundColor: color + '55' }]} />
                      </View>
                      <Text style={styles.compPct}>{peerPct}%</Text>
                    </View>

                    <Text style={[styles.compDiff, {
                      color: diff == null ? 'transparent' : Math.abs(diff) <= 5 ? '#9CA3AF' : diff > 0 ? '#2563EB' : '#EF4444'
                    }]}>
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff}%` : ''}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* 맞춤 조언 */}
          {peerData && currentAgeData && (() => {
            const tips: string[] = []

            // 총 자산 조언
            tips.push(peerData.advice)

            // 구성 비율 조언 (myAssetComp 있을 때만)
            if (myAssetComp) {
              const depDiff  = myAssetComp.depositTotal - currentAgeData.deposit
              const stDiff   = myAssetComp.stock        - currentAgeData.stock
              const insDiff  = myAssetComp.insurance    - currentAgeData.insurance

              if (depDiff > 10)
                tips.push(`예·적금 비중이 또래보다 ${depDiff}% 높아요. 주식·ETF 비율을 조금씩 늘려볼 만해요.`)
              else if (depDiff < -10)
                tips.push(`예·적금 비중이 또래보다 ${Math.abs(depDiff)}% 낮아요. 비상금성 예·적금을 먼저 확보하세요.`)

              if (stDiff < -10)
                tips.push(`주식·ETF 비중이 또래보다 ${Math.abs(stDiff)}% 낮아요. 소액 ETF 투자로 시작해볼 수 있어요.`)
              else if (stDiff > 15)
                tips.push(`주식·ETF 비중이 또래보다 ${stDiff}% 높아요. 안전자산도 함께 유지하는 게 좋아요.`)

              if (insDiff < -5)
                tips.push(`보험·연금 비중이 또래보다 낮아요. 실손보험·연금저축부터 챙겨보세요.`)
            }

            return (
              <View style={[styles.card, styles.adviceCard]}>
                <View style={styles.adviceHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#2563EB" />
                  <Text style={styles.adviceTitle}>맞춤 조언</Text>
                </View>
                {tips.map((t, i) => (
                  <View key={i} style={i > 0 ? { marginTop: 8 } : {}}>
                    <Text style={styles.adviceText}>{t}</Text>
                  </View>
                ))}
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
            )
          })()}

          {/* 인기 ETF */}
          {etfs.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>순자산 상위 ETF</Text>
              <Text style={styles.hint}>KRX 데이터 기준</Text>
              {etfFallback && (
                <View style={styles.fallbackBanner}>
                  <Ionicons name="construct-outline" size={13} color="#D97706" />
                  <Text style={styles.fallbackText}>
                    API 연동 작업 중 · KRX 순자산 상위 ETF 기준값으로 표시
                  </Text>
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

  compColHead: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  compDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  compLabel: { fontSize: 12, fontWeight: '600', color: '#374151', width: 54, flexShrink: 0 },
  compBarGroup: { flex: 1, gap: 2 },
  compBarBg: { height: 7, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  compBarFill: { height: 7, borderRadius: 4 },
  compPct: { fontSize: 10, color: '#6B7280', alignSelf: 'flex-end' },
  compPctEmpty: { fontSize: 10, color: '#D1D5DB' },
  compDiff: { fontSize: 11, fontWeight: '700', width: 34, textAlign: 'right', flexShrink: 0 },
})
