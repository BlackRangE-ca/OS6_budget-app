import { useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Svg, { Circle, G, Polyline, Line, Text as SvgText } from 'react-native-svg'
import { supabase } from '../../lib/supabase'
import { CATEGORY_COLORS } from '../../lib/constants'

const SCREEN_W = Dimensions.get('window').width
const GRAPH_W = SCREEN_W - 80
const GRAPH_H = 120

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
  center: { position: 'absolute', left: 0, width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
  pct: { fontSize: 22, fontWeight: '800', color: '#111827' },
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

export default function AnalysisScreen() {
  const [topCategory, setTopCategory] = useState('')
  const [topRatio, setTopRatio] = useState(0)
  const [allCategories, setAllCategories] = useState<{ category: string; amount: number; ratio: number }[]>([])
  const [dailyTotals, setDailyTotals] = useState<number[]>(Array(31).fill(0))
  const [changes, setChanges] = useState<{ label: string; isIncrease: boolean }[]>([])
  const [changeSummary, setChangeSummary] = useState('')

  useFocusEffect(
    useCallback(() => { fetchData() }, [])
  )

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = lastMonthDate.toISOString().slice(0, 7)

    const [{ data: txData }, { data: lastTxData }] = await Promise.all([
      supabase.from('transactions').select('*')
        .eq('user_id', user!.id)
        .gte('date', `${thisMonth}-01`)
        .lte('date', `${thisMonth}-31`),
      supabase.from('transactions').select('*')
        .eq('user_id', user!.id)
        .gte('date', `${lastMonth}-01`)
        .lte('date', `${lastMonth}-31`),
    ])

    if (!txData || txData.length === 0) return

    // 카테고리별 합계
    const catMap: Record<string, number> = {}
    txData.forEach(t => { catMap[t.category] = (catMap[t.category] ?? 0) + t.amount })
    const total = Object.values(catMap).reduce((a, b) => a + b, 0)
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      setTopCategory(sorted[0][0])
      setTopRatio(Math.round(sorted[0][1] / total * 100))
      setAllCategories(sorted.filter(([, amt]) => amt > 0).map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        ratio: Math.round(amt / total * 100),
      })))
    }

    // 일별 합계
    const daily = Array(31).fill(0)
    txData.forEach(t => {
      const day = parseInt(t.date.split('-')[2]) - 1
      if (day >= 0 && day < 31) daily[day] += t.amount
    })
    setDailyTotals(daily)

    // 지난달 대비 변화
    if (lastTxData && lastTxData.length > 0) {
      const lastCatMap: Record<string, number> = {}
      lastTxData.forEach(t => { lastCatMap[t.category] = (lastCatMap[t.category] ?? 0) + t.amount })
      const lastTotal = Object.values(lastCatMap).reduce((a, b) => a + b, 0)

      const changeList: { label: string; isIncrease: boolean; diff: number; cat: string }[] = []
      Object.entries(catMap).forEach(([cat, amt]) => {
        const lastAmt = lastCatMap[cat] ?? 0
        if (lastAmt > 0) {
          const diff = Math.round((amt - lastAmt) / lastAmt * 100)
          if (Math.abs(diff) >= 5) {
            changeList.push({ label: `${cat} ${diff > 0 ? '증가' : '감소'} ${diff > 0 ? '+' : ''}${diff}%`, isIncrease: diff > 0, diff: Math.abs(diff), cat })
          }
        }
      })
      changeList.sort((a, b) => b.diff - a.diff)
      setChanges(changeList.slice(0, 2))

      // 주요 변화 텍스트
      if (changeList.length >= 2) {
        const a = changeList[0]
        const b = changeList[1]
        setChangeSummary(`${a.cat}가 지난달보다 ${a.diff}% ${a.isIncrease ? '증가했고' : '감소했고'} ${b.cat}는 ${b.diff}% ${b.isIncrease ? '증가했어요.' : '감소했어요.'}`)
      } else if (changeList.length === 1) {
        const a = changeList[0]
        setChangeSummary(`${a.cat}가 지난달보다 ${a.diff}% ${a.isIncrease ? '증가했어요.' : '감소했어요.'}`)
      } else {
        setChangeSummary('지난달과 소비 패턴이 비슷해요.')
      }
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>소비 패턴 분석</Text>
      <Text style={styles.subtitle}>지난달 대비 변화를 확인해요</Text>

      {/* 도넛 차트 카드 */}
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

      {/* 라인 그래프 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>한달 소비 그래프</Text>
        <LineGraph dailyTotals={dailyTotals} />
      </View>

      {/* 주요 변화 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>주요 변화</Text>
        <Text style={styles.summaryText}>{changeSummary || '지난달 데이터가 없어요.'}</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', padding: 16, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
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
  catName: { width: 36, fontSize: 13, color: '#374151', fontWeight: '600' },
  catBarWrap: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, backgroundColor: '#2563EB', borderRadius: 4 },
  catAmount: { fontSize: 11, color: '#6B7280', width: 110, textAlign: 'right', flexShrink: 0 },
})
