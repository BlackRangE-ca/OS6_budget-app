import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, G, Polyline, Line, Text as SvgText } from 'react-native-svg'
import { supabase } from '../../lib/supabase'
import { CATEGORY_COLORS } from '../../lib/constants'
import {
  analyzeConsumptionType,
  getBenchmarkComparison,
  calculateFinancialScore,
  FinancialScore,
  BenchmarkComparison,
} from '../../lib/analyzeConsumption'

const SCREEN_W = Dimensions.get('window').width
const GRAPH_W = SCREEN_W - 80
const GRAPH_H = 120

const GRADE_COLOR: Record<string, string> = {
  S: '#7C3AED', A: '#2563EB', B: '#16A34A', C: '#D97706', D: '#EF4444',
}

function DonutChart({ segments, topCategory, topRatio }: {
  segments: { category: string; ratio: number }[]
  topCategory: string
  topRatio: number
}) {
  const size = 160
  const strokeWidth = 28
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  let cumulative = 0

  return (
    <View style={donutStyles.wrap}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="#F3F4F6" strokeWidth={strokeWidth} fill="none" />
        {segments.map(({ category, ratio }) => {
          const portion = ratio / 100
          const rotation = -90 + cumulative * 360
          cumulative += portion
          return (
            <G key={category} rotation={rotation} origin={`${cx},${cy}`}>
              <Circle
                cx={cx} cy={cy} r={r}
                stroke={CATEGORY_COLORS[category] ?? '#9CA3AF'}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={[portion * circumference, circumference]}
              />
            </G>
          )
        })}
      </Svg>
      <View style={donutStyles.label}>
        <Text style={donutStyles.category}>{topCategory}</Text>
        <Text style={donutStyles.categoryPct}>{topRatio}%</Text>
      </View>
    </View>
  )
}

const donutStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  label: { justifyContent: 'center' },
  category: { fontSize: 22, fontWeight: '800', color: '#111827' },
  categoryPct: { fontSize: 28, fontWeight: '800', color: '#111827' },
})

function LineGraph({ dailyTotals }: { dailyTotals: number[] }) {
  const maxVal = Math.max(...dailyTotals, 1)
  const pad = { top: 10, bottom: 24, left: 8, right: 8 }
  const innerW = GRAPH_W - pad.left - pad.right
  const innerH = GRAPH_H - pad.top - pad.bottom
  const nonZero = dailyTotals.filter(v => v > 0)
  if (nonZero.length < 2) {
    return <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>지출 데이터가 부족해요</Text>
  }

  const points = dailyTotals.map((val, i) => {
    const x = pad.left + (i / (dailyTotals.length - 1)) * innerW
    const y = pad.top + innerH - (val / maxVal) * innerH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <Svg width={GRAPH_W} height={GRAPH_H}>
      <Line x1={pad.left} y1={GRAPH_H - pad.bottom} x2={GRAPH_W - pad.right} y2={GRAPH_H - pad.bottom} stroke="#F3F4F6" strokeWidth={1} />
      <Polyline points={points} fill="none" stroke="#2563EB" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <SvgText x={pad.left} y={GRAPH_H - 4} fontSize={10} fill="#9CA3AF">1</SvgText>
      <SvgText x={GRAPH_W - pad.right - 8} y={GRAPH_H - 4} fontSize={10} fill="#9CA3AF">31</SvgText>
    </Svg>
  )
}

function ScoreCard({ score }: { score: FinancialScore }) {
  const gradeColor = GRADE_COLOR[score.grade] ?? '#6B7280'
  const items = [
    { label: '저축률', value: score.savingsScore, max: 25 },
    { label: '고정비', value: score.fixedCostScore, max: 25 },
    { label: '예산준수', value: score.budgetScore, max: 25 },
    { label: '소비분산', value: score.concentrationScore, max: 25 },
  ]

  return (
    <View style={scoreStyles.container}>
      <View style={scoreStyles.header}>
        <View>
          <Text style={scoreStyles.label}>재무 건강 점수</Text>
          <Text style={scoreStyles.message}>{score.gradeMessage}</Text>
        </View>
        <View style={[scoreStyles.gradeBadge, { backgroundColor: gradeColor + '18' }]}>
          <Text style={[scoreStyles.grade, { color: gradeColor }]}>{score.grade}</Text>
          <Text style={[scoreStyles.totalScore, { color: gradeColor }]}>{score.total}점</Text>
        </View>
      </View>
      <View style={scoreStyles.bars}>
        {items.map(({ label, value, max }) => (
          <View key={label} style={scoreStyles.barRow}>
            <Text style={scoreStyles.barLabel}>{label}</Text>
            <View style={scoreStyles.barBg}>
              <View style={[scoreStyles.barFill, {
                width: `${(value / max) * 100}%` as any,
                backgroundColor: gradeColor,
              }]} />
            </View>
            <Text style={scoreStyles.barValue}>{value}/{max}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const scoreStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  message: { fontSize: 16, fontWeight: '700', color: '#111827' },
  gradeBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  grade: { fontSize: 22, fontWeight: '900' },
  totalScore: { fontSize: 12, fontWeight: '600' },
  bars: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 58, fontSize: 12, color: '#6B7280', fontWeight: '600' },
  barBg: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { width: 36, fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
})

function BenchmarkCard({ benchmarks }: { benchmarks: BenchmarkComparison[] }) {
  const overItems = benchmarks.filter(b => b.diff > 5)
  const underItems = benchmarks.filter(b => b.diff < -5)

  if (overItems.length === 0 && underItems.length === 0) {
    return (
      <View>
        <Text style={bmStyles.title}>또래 평균 비교</Text>
        <Text style={bmStyles.good}>사회초년생 권장 비율과 비슷해요 👍</Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={bmStyles.title}>또래 평균 비교</Text>
      <Text style={bmStyles.sub}>사회초년생 권장 비율 기준</Text>
      {overItems.map(b => (
        <View key={b.category} style={bmStyles.row}>
          <View style={bmStyles.badge_red}>
            <Text style={bmStyles.text_red}>{b.category} +{b.diff}%</Text>
          </View>
          <Text style={bmStyles.hint}>권장 {b.benchmarkRatio}% → 내 지출 {b.myRatio}%</Text>
        </View>
      ))}
      {underItems.map(b => (
        <View key={b.category} style={bmStyles.row}>
          <View style={bmStyles.badge_green}>
            <Text style={bmStyles.text_green}>{b.category} {b.diff}%</Text>
          </View>
          <Text style={bmStyles.hint}>권장 {b.benchmarkRatio}% → 내 지출 {b.myRatio}%</Text>
        </View>
      ))}
    </View>
  )
}

const bmStyles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sub: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  good: { fontSize: 14, color: '#16A34A', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge_red: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badge_green: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  text_red: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
  text_green: { fontSize: 12, color: '#16A34A', fontWeight: '700' },
  hint: { flex: 1, fontSize: 12, color: '#6B7280' },
})

type MonthTrend = { label: string; total: number; month: string }

function TrendChart({ months }: { months: MonthTrend[] }) {
  const maxVal = Math.max(...months.map(m => m.total), 1)
  if (months.every(m => m.total === 0)) {
    return <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>데이터가 부족해요</Text>
  }

  return (
    <View>
      <View style={trendStyles.bars}>
        {months.map((m, i) => {
          const ratio = m.total / maxVal
          const prev = months[i - 1]
          const diff = prev && prev.total > 0
            ? Math.round((m.total - prev.total) / prev.total * 100)
            : null
          const isUp = diff !== null && diff > 0
          const isDown = diff !== null && diff < 0

          return (
            <View key={m.month} style={trendStyles.barCol}>
              <View style={trendStyles.barWrap}>
                <View style={[trendStyles.bar, {
                  height: Math.max(4, ratio * 80),
                  backgroundColor: i === months.length - 1 ? '#2563EB' : '#BFDBFE',
                }]} />
              </View>
              {diff !== null && (
                <Text style={[trendStyles.diff, { color: isUp ? '#EF4444' : isDown ? '#16A34A' : '#9CA3AF' }]}>
                  {isUp ? '▲' : isDown ? '▼' : '—'}{Math.abs(diff)}%
                </Text>
              )}
              <Text style={trendStyles.monthLabel}>{m.label}</Text>
              <Text style={trendStyles.amount}>{(m.total / 10000).toFixed(0)}만</Text>
            </View>
          )
        })}
      </View>

      {/* 트렌드 요약 문장 */}
      {months.length >= 2 && (() => {
        const cur = months[months.length - 1]
        const prv = months[months.length - 2]
        if (prv.total === 0) return null
        const diff = Math.round((cur.total - prv.total) / prv.total * 100)
        const isUp = diff > 0
        return (
          <View style={[trendStyles.summary, { backgroundColor: isUp ? '#FEF2F2' : '#F0FDF4' }]}>
            <Text style={[trendStyles.summaryText, { color: isUp ? '#EF4444' : '#16A34A' }]}>
              {isUp ? '📈' : '📉'} 지난달보다 지출 {Math.abs(diff)}% {isUp ? '증가' : '감소'}했어요
              {!isUp && ' · 잘 하고 있어요!'}
            </Text>
          </View>
        )
      })()}
    </View>
  )
}

const trendStyles = StyleSheet.create({
  bars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingBottom: 4 },
  barCol: { alignItems: 'center', gap: 4, flex: 1 },
  barWrap: { height: 80, justifyContent: 'flex-end', width: '60%' },
  bar: { width: '100%', borderRadius: 6 },
  diff: { fontSize: 10, fontWeight: '700' },
  monthLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  amount: { fontSize: 11, color: '#9CA3AF' },
  summary: { marginTop: 12, borderRadius: 10, padding: 10 },
  summaryText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
})

const ASSET_TYPES = [
  { key: 'deposit',   label: '예금',      color: '#2563EB' },
  { key: 'savings',   label: '적금',      color: '#0EA5E9' },
  { key: 'stock',     label: '주식·ETF',  color: '#7C3AED' },
  { key: 'insurance', label: '보험·연금', color: '#16A34A' },
  { key: 'other',     label: '기타',      color: '#D97706' },
] as const
type AssetKey = 'deposit' | 'savings' | 'stock' | 'insurance' | 'other'

function formatHistoryLabel(recordedAt: string): string {
  const d = new Date(recordedAt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return `${d.getHours()}시`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtNum(v: string) {
  const n = v.replace(/[^0-9]/g, '')
  return n ? Number(n).toLocaleString() : ''
}
function parseNum(v: string) { return parseInt(v.replace(/,/g, '')) || 0 }

function getAssetInsights(deposit: number, stock: number, insurance: number, other: number): string[] {
  const total = deposit + stock + insurance + other
  if (total === 0) return []
  const dp = deposit / total, st = stock / total, ins = insurance / total
  const tips: string[] = []
  if (dp > 0.7) tips.push('예·적금 비중이 70% 이상이에요. 주식·ETF로 수익성을 높여볼 만해요.')
  else if (dp < 0.3) tips.push('안전자산(예·적금) 비중이 낮아요. 비상금 확보를 먼저 챙겨요.')
  if (st > 0.5) tips.push('주식 비중이 절반 이상이에요. 안전자산도 함께 유지하는 게 좋아요.')
  else if (st === 0) tips.push('주식·ETF 비중이 없어요. 소액 ETF 투자로 시작해볼 수 있어요.')
  if (ins < 0.1) tips.push('보험·연금 비중이 낮아요. 사회초년생은 실손보험·연금저축부터 챙겨요.')
  if (tips.length === 0) tips.push('자산 구성이 균형 잡혀 있어요. 꾸준히 유지해보세요!')
  return tips
}

function getMonthStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return getMonthStr(d)
}

export default function AnalysisScreen() {
  const currentMonth = getMonthStr(new Date())
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [topCategory, setTopCategory] = useState('')
  const [topRatio, setTopRatio] = useState(0)
  const [allCategories, setAllCategories] = useState<{ category: string; amount: number; ratio: number }[]>([])
  const [dailyTotals, setDailyTotals] = useState<number[]>(Array(31).fill(0))
  const [changes, setChanges] = useState<{ label: string; isIncrease: boolean }[]>([])
  const [changeSummary, setChangeSummary] = useState('')
  const [score, setScore] = useState<FinancialScore | null>(null)
  const [benchmarks, setBenchmarks] = useState<BenchmarkComparison[]>([])
  const [overSpent, setOverSpent] = useState<string[]>([])
  const [monthTrends, setMonthTrends] = useState<MonthTrend[]>([])
  const [spikedCategories, setSpikedCategories] = useState<{ category: string; diff: number; thisAmt: number; lastAmt: number }[]>([])

  const [assets, setAssets] = useState({ deposit: 0, savings: 0, stock: 0, insurance: 0, other: 0 })
  const [assetModal, setAssetModal] = useState(false)
  const [assetInputs, setAssetInputs] = useState<Record<AssetKey, string>>({ deposit: '', savings: '', stock: '', insurance: '', other: '' })
  const [savingAsset, setSavingAsset] = useState(false)
  const [assetHistory, setAssetHistory] = useState<{ recordedAt: string; label: string; total: number; deposit: number; savings: number; stock: number; insurance: number; other: number }[]>([])

  useFocusEffect(useCallback(() => {
    fetchData(selectedMonth)
    fetchAssets()
  }, [selectedMonth]))
  async function fetchAssets() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data }, { data: historyData }] = await Promise.all([
      supabase.from('user_assets').select('*').eq('user_id', user!.id).single(),
      supabase.from('user_asset_history').select('*').eq('user_id', user!.id)
        .order('recorded_at', { ascending: true }).limit(20),
    ])
    if (data) {
      setAssets({
        deposit:   data.deposit   ?? 0,
        savings:   data.savings   ?? 0,
        stock:     data.stock     ?? 0,
        insurance: data.insurance ?? 0,
        other:     data.other     ?? 0,
      })
      setAssetInputs({
        deposit:   data.deposit   ? data.deposit.toLocaleString()   : '',
        savings:   data.savings   ? data.savings.toLocaleString()   : '',
        stock:     data.stock     ? data.stock.toLocaleString()     : '',
        insurance: data.insurance ? data.insurance.toLocaleString() : '',
        other:     data.other     ? data.other.toLocaleString()     : '',
      })
    }
    if (historyData && historyData.length > 0) {
      setAssetHistory(historyData.map(r => ({
        recordedAt: r.recorded_at,
        label: formatHistoryLabel(r.recorded_at),
        total: (r.deposit ?? 0) + (r.savings ?? 0) + (r.stock ?? 0) + (r.insurance ?? 0) + (r.other ?? 0),
        deposit:   r.deposit   ?? 0,
        savings:   r.savings   ?? 0,
        stock:     r.stock     ?? 0,
        insurance: r.insurance ?? 0,
        other:     r.other     ?? 0,
      })))
    }
  }

  async function saveAssets() {
    setSavingAsset(true)
    const { data: { user } } = await supabase.auth.getUser()
    const deposit   = parseNum(assetInputs.deposit)
    const savings   = parseNum(assetInputs.savings)
    const stock     = parseNum(assetInputs.stock)
    const insurance = parseNum(assetInputs.insurance)
    const other     = parseNum(assetInputs.other)
    const [upsertResult, insertResult] = await Promise.all([
      supabase.from('user_assets').upsert({
        user_id: user!.id, deposit, savings, stock, insurance, other,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }),
      supabase.from('user_asset_history').insert({
        user_id: user!.id, deposit, savings, stock, insurance, other,
      }),
    ])
    if (upsertResult.error || insertResult.error) {
      Alert.alert('오류', '저장에 실패했습니다.')
    } else {
      setAssets({ deposit, savings, stock, insurance, other })
      setAssetModal(false)
      await fetchAssets()
    }
    setSavingAsset(false)
  }

  // 월 변경 시 상태 초기화 후 재조회
  useEffect(() => {
    setTopCategory('')
    setTopRatio(0)
    setAllCategories([])
    setDailyTotals(Array(31).fill(0))
    setChanges([])
    setChangeSummary('')
    setScore(null)
    setBenchmarks([])
    setOverSpent([])
    setSpikedCategories([])
    setMonthTrends([])
    fetchData(selectedMonth)
  }, [selectedMonth])

  async function fetchData(selected: string) {
    const { data: { user } } = await supabase.auth.getUser()

    const months = [2, 1, 0].map(offset => {
      const m = shiftMonth(selected, -offset)
      const label = `${parseInt(m.split('-')[1])}월`
      return { month: m, label }
    })

    const [txResults, { data: budgetData }] = await Promise.all([
      Promise.all(months.map(({ month }) =>
        supabase.from('transactions').select('*').eq('user_id', user!.id)
          .gte('date', `${month}-01`).lt('date', `${shiftMonth(month, 1)}-01`)
      )),
      supabase.from('budgets').select('*').eq('user_id', user!.id)
        .eq('month', months[2].month).single(),
    ])

    const [twoMonthsAgoData, lastTxData, thisData] = txResults.map(r => r.data ?? [])

    if (!thisData || thisData.length === 0) return

    const spendingTx = thisData.filter((t: any) => t.type !== 'income')
    const fixedTx = thisData.filter((t: any) => t.type === 'fixed')

    // 카테고리별 합계
    const catMap: Record<string, number> = {}
    spendingTx.forEach((t: any) => { catMap[t.category] = (catMap[t.category] ?? 0) + t.amount })
    const total = Object.values(catMap).reduce((a: number, b: number) => a + b, 0)
    const sorted = Object.entries(catMap).sort((a, b) => (b[1] as number) - (a[1] as number))

    if (sorted.length > 0) {
      setTopCategory(sorted[0][0])
      setTopRatio(Math.round((sorted[0][1] as number) / total * 100))
      setAllCategories(sorted.filter(([, amt]) => (amt as number) > 0).map(([cat, amt]) => ({
        category: cat, amount: amt as number, ratio: Math.round((amt as number) / total * 100),
      })))
    }

    // 일별 합계
    const daily = Array(31).fill(0)
    spendingTx.forEach((t: any) => {
      const day = parseInt(t.date.split('-')[2]) - 1
      if (day >= 0 && day < 31) daily[day] += t.amount
    })
    setDailyTotals(daily)

    // 3개월 트렌드
    const trendData = [twoMonthsAgoData, lastTxData, spendingTx]
    setMonthTrends(months.map(({ month, label }, i) => ({
      month,
      label,
      total: (trendData[i] ?? [])
        .filter((t: any) => t.type !== 'income')
        .reduce((s: number, t: any) => s + t.amount, 0),
    })))

    // 지난달 대비 변화
    const lastSpending = lastTxData.filter((t: any) => t.type !== 'income')
    if (lastSpending.length > 0) {
      const lastCatMap: Record<string, number> = {}
      lastSpending.forEach((t: any) => {
        lastCatMap[t.category] = (lastCatMap[t.category] ?? 0) + t.amount
      })

      // 전월 대비 50% 이상 급등 카테고리 탐지
      const spiked = Object.entries(catMap)
        .filter(([cat, amt]) => {
          const lastAmt = lastCatMap[cat] ?? 0
          return lastAmt > 0 && ((amt as number) - lastAmt) / lastAmt >= 0.5
        })
        .map(([cat, amt]) => {
          const lastAmt = lastCatMap[cat] ?? 0
          return {
            category: cat,
            diff: Math.round(((amt as number) - lastAmt) / lastAmt * 100),
            thisAmt: amt as number,
            lastAmt,
          }
        })
        .sort((a, b) => b.diff - a.diff)
      setSpikedCategories(spiked)

      const changeList: { label: string; isIncrease: boolean; diff: number; cat: string }[] = []
      Object.entries(catMap).forEach(([cat, amt]) => {
        const lastAmt = lastCatMap[cat] ?? 0
        if (lastAmt > 0) {
          const diff = Math.round(((amt as number) - lastAmt) / lastAmt * 100)
          if (Math.abs(diff) >= 5)
            changeList.push({ label: `${cat} ${diff > 0 ? '증가' : '감소'} ${diff > 0 ? '+' : ''}${diff}%`, isIncrease: diff > 0, diff: Math.abs(diff), cat })
        }
      })
      changeList.sort((a, b) => b.diff - a.diff)
      setChanges(changeList.slice(0, 2))

      if (changeList.length >= 2) {
        const a = changeList[0], b = changeList[1]
        setChangeSummary(`${a.cat}가 지난달보다 ${a.diff}% ${a.isIncrease ? '증가했고' : '감소했고'} ${b.cat}는 ${b.diff}% ${b.isIncrease ? '증가했어요.' : '감소했어요.'}`)
      } else if (changeList.length === 1) {
        const a = changeList[0]
        setChangeSummary(`${a.cat}가 지난달보다 ${a.diff}% ${a.isIncrease ? '증가했어요.' : '감소했어요.'}`)
      } else {
        setChangeSummary('지난달과 소비 패턴이 비슷해요.')
      }
    }

    // 재무 점수 & 벤치마크
    const result = analyzeConsumptionType(thisData, budgetData?.salary, budgetData?.amount, fixedTx)
    setScore(result.score)
    setBenchmarks(result.benchmarks)
    setOverSpent(result.overSpentCategories)
  }

  const assetTotal = assets.deposit + assets.savings + assets.stock + assets.insurance + assets.other

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>소비 패턴 분석</Text>

      {/* 내 자산 카드 */}
      <TouchableOpacity style={styles.assetCard} onPress={() => setAssetModal(true)} activeOpacity={0.8}>
        <View style={styles.assetCardHeader}>
          <View>
            <Text style={styles.assetCardLabel}>내 자산</Text>
            <Text style={styles.assetCardTotal}>
              {assetTotal > 0 ? `${assetTotal.toLocaleString()}원` : '자산을 입력해주세요'}
            </Text>
          </View>
          <View style={styles.assetEditBtn}>
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
            <Text style={styles.assetEditText}>수정</Text>
          </View>
        </View>
        {assetTotal > 0 && (
          <>
            <View style={styles.assetBar}>
              {ASSET_TYPES.map(({ key, color }) => {
                const ratio = assets[key] / assetTotal
                if (ratio === 0) return null
                return <View key={key} style={[styles.assetBarSeg, { flex: ratio, backgroundColor: color }]} />
              })}
            </View>
            <View style={styles.assetLegend}>
              {ASSET_TYPES.map(({ key, label, color }) => {
                if (assets[key] === 0) return null
                return (
                  <View key={key} style={styles.assetLegendItem}>
                    <View style={[styles.assetLegendDot, { backgroundColor: color }]} />
                    <Text style={styles.assetLegendText}>{label} {Math.round(assets[key] / assetTotal * 100)}%</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </TouchableOpacity>


      {/* 자산 변동 추이 */}
      {assetHistory.length >= 2 && (() => {
        const maxTotal = Math.max(...assetHistory.map(h => h.total), 1)
        const latest = assetHistory[assetHistory.length - 1]
        const prev = assetHistory[assetHistory.length - 2]
        const diff = prev.total > 0 ? Math.round((latest.total - prev.total) / prev.total * 100) : 0
        const isUp = diff > 0

        const latestD = new Date(latest.recordedAt)
        const prevD = new Date(prev.recordedAt)
        const sameDay = latestD.toDateString() === prevD.toDateString()
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const isYesterday = prevD.toDateString() === yesterday.toDateString()
        const compareLabel = sameDay
          ? `${prevD.getHours()}시 기록 대비`
          : isYesterday ? '어제 기록 대비'
          : `${prevD.getMonth() + 1}/${prevD.getDate()} 기록 대비`

        const catChanges = ASSET_TYPES.map(({ key, label, color }) => ({
          label, color,
          diff: latest[key] - prev[key],
        })).filter(c => c.diff !== 0)

        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>자산 변동 추이</Text>
            <View style={styles.assetTrendBars}>
              {assetHistory.map((h, i) => {
                const prevH = assetHistory[i - 1]
                const d = prevH && prevH.total > 0 ? Math.round((h.total - prevH.total) / prevH.total * 100) : null
                return (
                  <View key={h.recordedAt} style={styles.assetTrendCol}>
                    <View style={styles.assetTrendBarWrap}>
                      {ASSET_TYPES.slice().reverse().map(({ key, color }) => {
                        const segRatio = h.total > 0 ? h[key] / maxTotal : 0
                        if (segRatio === 0) return null
                        return <View key={key} style={[styles.assetTrendSeg, { height: Math.max(2, segRatio * 80), backgroundColor: color }]} />
                      })}
                    </View>
                    {d !== null && (
                      <Text style={[styles.assetTrendDiff, { color: d > 0 ? '#16A34A' : d < 0 ? '#EF4444' : '#9CA3AF' }]}>
                        {d > 0 ? '▲' : d < 0 ? '▼' : '—'}{Math.abs(d)}%
                      </Text>
                    )}
                    <Text style={styles.assetTrendLabel}>{h.label}</Text>
                    <Text style={styles.assetTrendAmt}>
                      {h.total >= 10000000
                        ? `${(h.total / 10000000).toFixed(1)}천만`
                        : h.total >= 10000
                        ? `${(h.total / 10000).toFixed(0)}만`
                        : `${h.total.toLocaleString()}`}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* 전체 변동 요약 */}
            <View style={[styles.assetTrendSummary, { backgroundColor: isUp ? '#F0FDF4' : diff < 0 ? '#FEF2F2' : '#F3F4F6' }]}>
              <Text style={[styles.assetTrendSummaryText, { color: isUp ? '#16A34A' : diff < 0 ? '#EF4444' : '#6B7280' }]}>
                {isUp ? '📈' : diff < 0 ? '📉' : '➡️'} {compareLabel} 총 자산{' '}
                {diff !== 0 ? `${Math.abs(diff)}% ${isUp ? '증가' : '감소'}` : '변동 없음'}
                {isUp ? ' · 잘 하고 있어요!' : ''}
              </Text>
            </View>

            {/* 카테고리별 변동 내역 */}
            {catChanges.length > 0 && (
              <View style={styles.catChangeBox}>
                {catChanges.map(({ label, color, diff: cd }) => (
                  <View key={label} style={styles.catChangeRow}>
                    <View style={[styles.assetTrendSeg, { width: 8, height: 8, borderRadius: 4, backgroundColor: color }]} />
                    <Text style={styles.catChangeLabel}>{label}</Text>
                    <Text style={[styles.catChangeDiff, { color: cd > 0 ? '#16A34A' : '#EF4444' }]}>
                      {cd > 0 ? '+' : ''}{cd >= 10000 ? `${(cd / 10000).toFixed(0)}만원` : `${cd.toLocaleString()}원`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )
      })()}


      {/* 월 선택기 */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {selectedMonth.split('-')[0]}년 {parseInt(selectedMonth.split('-')[1])}월
        </Text>
        <TouchableOpacity
          style={[styles.monthArrow, selectedMonth === currentMonth && styles.monthArrowDisabled]}
          onPress={() => selectedMonth !== currentMonth && setSelectedMonth(shiftMonth(selectedMonth, 1))}
          disabled={selectedMonth === currentMonth}
        >
          <Ionicons name="chevron-forward" size={18} color={selectedMonth === currentMonth ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      {/* 재무 건강 점수 카드 */}
      {score && (
        <View style={styles.card}>
          <ScoreCard score={score} />
        </View>
      )}

      {/* 과소비 카테고리 경고 */}
      {overSpent.length > 0 && (
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningTitle}>⚠️ 권장 비율 초과</Text>
          <Text style={styles.warningText}>
            {overSpent.join(', ')} 지출이 사회초년생 권장 비율보다 높아요
          </Text>
        </View>
      )}

      {/* 급등 카테고리 경고 */}
      {spikedCategories.length > 0 && (
        <View style={[styles.card, styles.spikeCard]}>
          <Text style={styles.warningTitle}>📈 지난달 대비 급등</Text>
          {spikedCategories.map(({ category, diff, thisAmt, lastAmt }) => (
            <View key={category} style={styles.spikeRow}>
              <Text style={styles.spikeCat}>{category}</Text>
              <Text style={styles.spikeDiff}>+{diff}%</Text>
              <Text style={styles.spikeDetail}>
                {lastAmt.toLocaleString()}원 → {thisAmt.toLocaleString()}원
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 도넛 차트 */}
      <View style={styles.card}>
        {topCategory ? (
          <>
            <DonutChart segments={allCategories} topCategory={topCategory} topRatio={topRatio} />
            {changes.length > 0 && (
              <View style={styles.badgeRow}>
                {changes.map((c, i) => (
                  <View key={i} style={[styles.badge, c.isIncrease ? styles.badgeRed : styles.badgeGreen]}>
                    <Text style={[styles.badgeText, c.isIncrease ? styles.badgeTextRed : styles.badgeTextGreen]}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.empty}>지출 데이터가 없어요</Text>
        )}
      </View>

      {/* 카테고리 목록 */}
      {allCategories.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>카테고리별 소비</Text>
          {allCategories.map(({ category, amount, ratio }) => (
            <View key={category} style={styles.catRow}>
              <Text style={styles.catName}>{category}</Text>
              <View style={styles.catBarWrap}>
                <View style={[styles.catBar, { width: `${ratio}%` as any, backgroundColor: CATEGORY_COLORS[category] ?? '#9CA3AF' }]} />
              </View>
              <Text style={styles.catAmount}>{amount.toLocaleString()}원 {ratio}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* 또래 벤치마크 */}
      {benchmarks.length > 0 && (
        <View style={styles.card}>
          <BenchmarkCard benchmarks={benchmarks} />
        </View>
      )}

      {/* 3개월 트렌드 */}
      {monthTrends.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3개월 지출 트렌드</Text>
          <TrendChart months={monthTrends} />
        </View>
      )}

      {/* 라인 그래프 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>이번달 일별 소비</Text>
        <LineGraph dailyTotals={dailyTotals} />
      </View>

      {/* 주요 변화 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>카테고리별 변화</Text>
        <Text style={styles.summaryText}>{changeSummary || '지난달 데이터가 없어요.'}</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>

    {/* 자산 입력 모달 */}
    <Modal visible={assetModal} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAssetModal(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>내 자산 입력</Text>
          <Text style={styles.modalSub}>보유 자산을 직접 입력해요</Text>
          {ASSET_TYPES.map(({ key, label, color }) => (
            <View key={key} style={styles.modalInputRow}>
              <View style={[styles.modalDot, { backgroundColor: color }]} />
              <Text style={styles.modalLabel}>{label}</Text>
              <TextInput
                style={styles.modalInput}
                value={assetInputs[key]}
                onChangeText={v => setAssetInputs(prev => ({ ...prev, [key]: fmtNum(v) }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
              />
              <Text style={styles.modalUnit}>원</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAssets} disabled={savingAsset}>
            <Text style={styles.modalSaveBtnText}>{savingAsset ? '저장 중...' : '저장하기'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', padding: 16, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 12 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, marginBottom: 12 },
  monthArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  monthArrowDisabled: { opacity: 0.4 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 100, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  warningCard: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#C2410C', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#9A3412', lineHeight: 20 },
  spikeCard: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  spikeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  spikeCat: { fontSize: 13, fontWeight: '700', color: '#111827', width: 52 },
  spikeDiff: { fontSize: 13, fontWeight: '800', color: '#EF4444', width: 50 },
  spikeDetail: { fontSize: 12, color: '#6B7280', flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 20 },
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  badgeRed: { backgroundColor: '#FEF3C7' },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextRed: { color: '#D97706' },
  badgeTextGreen: { color: '#16A34A' },
  empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 20 },
  summaryText: { fontSize: 15, color: '#374151', lineHeight: 24 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catName: { width: 44, fontSize: 13, color: '#374151', fontWeight: '600' },
  catBarWrap: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4 },
  catAmount: { fontSize: 11, color: '#6B7280', width: 120, textAlign: 'right', flexShrink: 0 },

  assetCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#EFF6FF',
  },
  assetCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  assetCardLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  assetCardTotal: { fontSize: 22, fontWeight: '800', color: '#111827' },
  assetEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  assetEditText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  assetBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 10 },
  assetBarSeg: { borderRadius: 5 },
  assetLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  assetLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  assetLegendDot: { width: 7, height: 7, borderRadius: 4 },
  assetLegendText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assetDot: { width: 8, height: 8, borderRadius: 4 },
  assetRowLabel: { fontSize: 13, color: '#374151', fontWeight: '600', width: 62 },
  assetRowBarBg: { flex: 1, height: 7, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  assetRowBarFill: { height: 7, borderRadius: 4 },
  assetRowPct: { fontSize: 12, color: '#9CA3AF', width: 32, textAlign: 'right' },
  assetRowAmt: { fontSize: 12, color: '#6B7280', width: 54, textAlign: 'right', fontWeight: '600' },

  insightRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  insightBullet: { fontSize: 14, color: '#2563EB', lineHeight: 20 },
  insightText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalDot: { width: 10, height: 10, borderRadius: 5 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', width: 70 },
  modalInput: {
    flex: 1, fontSize: 16, fontWeight: '600', color: '#111827',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, textAlign: 'right',
  },
  modalUnit: { fontSize: 14, color: '#6B7280' },
  modalSaveBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  modalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  assetTrendBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingBottom: 4, marginBottom: 12 },
  assetTrendCol: { alignItems: 'center', gap: 4, flex: 1 },
  assetTrendBarWrap: { height: 80, justifyContent: 'flex-end', width: '60%', gap: 1 },
  assetTrendSeg: { width: '100%', borderRadius: 3 },
  assetTrendDiff: { fontSize: 10, fontWeight: '700' },
  assetTrendLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  assetTrendAmt: { fontSize: 10, color: '#9CA3AF' },
  assetTrendSummary: { borderRadius: 10, padding: 10, marginTop: 4 },
  assetTrendSummaryText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  catChangeBox: { marginTop: 10, gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  catChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catChangeLabel: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600' },
  catChangeDiff: { fontSize: 13, fontWeight: '700' },

  assetAnalysisHeader: { marginBottom: 12 },
  peerPickerRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  peerToggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden' },
  peerToggleBtn: { paddingHorizontal: 9, paddingVertical: 5 },
  peerToggleBtnActive: { backgroundColor: '#2563EB', borderRadius: 8 },
  peerToggleText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  peerToggleTextActive: { color: '#fff' },

  peerCompareHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  peerCompareCol: { flex: 1 },
  peerCompareColLabel: { width: 90, fontSize: 11, color: '#9CA3AF', fontWeight: '700', textAlign: 'center' },
  peerCompareRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  peerCompareLabel: { fontSize: 12, color: '#374151', fontWeight: '600', width: 54 },
  peerBarGroup: { width: 90, gap: 2 },
  peerBarBg: { height: 7, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  peerBarFill: { height: 7, borderRadius: 4 },
  peerBarPct: { fontSize: 10, color: '#6B7280', textAlign: 'right' },
  peerDiff: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },
  dividerLine: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
})
