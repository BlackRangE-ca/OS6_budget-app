import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { fetchSupportPrograms, fetchYouthPolicies } from '../../lib/supportApi'
import { fetchDepositProducts, fetchSavingProducts } from '../../lib/financeApi'
import { fetchKeyStatistics, fetchExchangeRates, EconomyIndicator, ExchangeRate } from '../../lib/economyApi'
import { fetchYouthHousing, HousingNotice } from '../../lib/lhApi'

type CategoryType = 'policy' | 'finance' | 'housing' | 'economy'

type UserMetrics = {
  salary: number
  monthlySavings: number
  savingsRate: number
  totalSavings: number
}

// ── 공통 컴포넌트 ──────────────────────────────────────────

function FallbackBanner({ message = 'API 연동 작업 중 · 기준값으로 표시' }: { message?: string }) {
  return (
    <View style={styles.fallbackBanner}>
      <Ionicons name="construct-outline" size={13} color="#D97706" />
      <Text style={styles.fallbackText}>{message}</Text>
    </View>
  )
}

function RecommendCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.recommendCard}>
      <Text style={styles.recommendIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.recommendTitle}>{title}</Text>
        <Text style={styles.recommendBody}>{body}</Text>
      </View>
    </View>
  )
}

// ── 탭 정의 ───────────────────────────────────────────────

const TABS: { key: CategoryType; label: string }[] = [
  { key: 'policy', label: '정책' },
  { key: 'finance', label: '금융' },
  { key: 'housing', label: '주거' },
  { key: 'economy', label: '경제' },
]

// ── 경제 탭 헬퍼 ──────────────────────────────────────────

const ECONOMY_ICONS: Record<string, string> = {
  '기준금리': '🏦', '소비자물가': '🛒', '환율': '💱',
  '실업률': '👥', 'GDP': '📈', '수출': '📦', '생산': '🏭',
}

function getEconomyIcon(name: string) {
  const key = Object.keys(ECONOMY_ICONS).find(k => name.includes(k))
  return key ? ECONOMY_ICONS[key] : '📊'
}

function getEconomyInterpretation(name: string, value: string, savingsRate: number): string {
  const v = parseFloat(value.replace(/,/g, ''))
  if (name.includes('기준금리')) {
    if (v >= 3.0) {
      const suffix = savingsRate >= 0.2 ? ' 저축률이 좋으니 장기 예금도 고려해보세요.' : ' 저축 비율부터 높이는 게 우선이에요.'
      return `금리 높은 시기 → 예적금·채권이 유리해요.${savingsRate > 0 ? suffix : ''}`
    }
    if (v >= 1.5) return '금리 보통 → 예적금과 ETF 균형 있게 배분하세요'
    return '저금리 → 예적금보다 투자 비중 늘리는 게 유리해요'
  }
  if (name.includes('물가') || name.includes('CPI')) {
    if (v >= 3.0) {
      const suffix = savingsRate > 0 && savingsRate < 0.15 ? ' 지출 줄이고 저축률 먼저 높이세요.' : ' 현금 보유보다 자산 분산 투자를 권장해요.'
      return `물가 높음 →${suffix}`
    }
    if (v >= 2.0) return '물가 상승 중 → 고정 지출 점검이 필요해요'
    return '물가 안정 → 현재 소비 패턴 유지해도 괜찮아요'
  }
  if (name.includes('실업')) {
    if (v >= 4.0) return '실업률 높음 → 취업 지원정책 적극 활용하세요'
    return '고용 안정 → 이직·커리어 전환 고려해볼 시기예요'
  }
  return '경제 흐름을 참고해 자산관리 계획을 세워보세요'
}

// ── 맞춤 추천 로직 ────────────────────────────────────────

function getPolicyRecommend(m: UserMetrics): { icon: string; title: string; body: string } | null {
  if (m.salary === 0) return null
  const rate = m.savingsRate
  const monthlyManwon = Math.round(m.monthlySavings / 10000)
  if (rate < 0.1) return {
    icon: '💰',
    title: '청년도약계좌를 확인해보세요',
    body: `이번달 저축이 ${monthlyManwon}만원이에요. 월 최대 70만원 납입 시 정부 기여금까지 받을 수 있어요.`,
  }
  if (rate < 0.2) return {
    icon: '📋',
    title: '중소기업 취업이라면 소득세 감면 챙기세요',
    body: '5년간 소득세 90% 감면 혜택이에요. 이미 받고 있는지 확인해보세요.',
  }
  return {
    icon: '🎯',
    title: '청년내일채움공제 확인해보세요',
    body: `저축률 ${Math.round(rate * 100)}%로 잘 하고 있어요! 2년 만기에 최대 1,200만원을 모을 수 있어요.`,
  }
}

function getFinanceRecommend(m: UserMetrics): { icon: string; title: string; body: string } | null {
  if (m.salary === 0) return null
  const rate = m.savingsRate
  const monthlyManwon = Math.round(m.monthlySavings / 10000)
  if (rate < 0.1) return {
    icon: '🏦',
    title: '자동이체 적금으로 습관부터 만들어요',
    body: `이번달 저축 ${monthlyManwon}만원이에요. 소액이라도 자동이체 적금부터 시작해보세요.`,
  }
  if (rate < 0.2) return {
    icon: '📈',
    title: '고금리 정기예금으로 이자 수익 챙기세요',
    body: `저축률 ${Math.round(rate * 100)}%예요. 매달 ${monthlyManwon}만원을 정기예금으로 굴려보세요.`,
  }
  return {
    icon: '💹',
    title: 'ETF 적립식 투자도 고려해보세요',
    body: `저축률 ${Math.round(rate * 100)}%로 우수해요! 예적금 외 ETF 분산 투자로 수익률을 높여보세요.`,
  }
}

function getHousingRecommend(m: UserMetrics): { icon: string; title: string; body: string } | null {
  if (m.salary === 0) return null
  const manwon = Math.round(m.salary / 10000)
  if (manwon < 250) return {
    icon: '🏠',
    title: '청년 전세임대·매입임대가 맞아요',
    body: `월급 ${manwon}만원 기준으로 LH 청년 임대주택 자격이 될 수 있어요. 시세 40~50% 수준이에요.`,
  }
  if (manwon < 400) return {
    icon: '🏡',
    title: '버팀목 전세자금대출 또는 행복주택을 추천해요',
    body: `월급 ${manwon}만원 기준으로 연 1.8~2.7% 저금리 전세대출을 받을 수 있어요.`,
  }
  return {
    icon: '🏘️',
    title: '청년 주택드림 대출을 알아보세요',
    body: `월급 ${manwon}만원 기준으로 연 2.2~3.0% 금리로 최대 3억원까지 대출이 가능해요.`,
  }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

export default function SupportScreen({ navigation }: any) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('policy')
  const [policyPrograms, setPolicyPrograms] = useState<any[]>([])
  const [financePrograms, setFinancePrograms] = useState<any[]>([])
  const [housingNotices, setHousingNotices] = useState<HousingNotice[]>([])
  const [youthHousingPolicies, setYouthHousingPolicies] = useState<any[]>([])
  const [economyIndicators, setEconomyIndicators] = useState<EconomyIndicator[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [policyFallback, setPolicyFallback] = useState(false)
  const [housingFallback, setHousingFallback] = useState(false)
  const [economyFallback, setEconomyFallback] = useState(false)
  const [monthlyRent, setMonthlyRent] = useState(0)
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({ salary: 0, monthlySavings: 0, savingsRate: 0, totalSavings: 0 })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

      const [
        youthResult, bok, deposit, saving, housingResult, economyResult, ratesResult,
        { data: budgetData }, { data: allSavings }, { data: monthTx },
      ] = await Promise.all([
        fetchYouthPolicies(),
        fetchSupportPrograms().catch(() => []),
        fetchDepositProducts().catch(() => []),
        fetchSavingProducts().catch(() => []),
        fetchYouthHousing(),
        fetchKeyStatistics().catch(() => ({ data: [], isFallback: true })),
        fetchExchangeRates().catch(() => ({ data: [], isFallback: true })),
        supabase.from('budgets').select('salary').eq('user_id', user.id).eq('month', thisMonth).maybeSingle(),
        supabase.from('transactions').select('amount').eq('user_id', user.id).eq('category', '저축'),
        supabase.from('transactions').select('amount, category').eq('user_id', user.id)
          .gte('date', `${thisMonth}-01`).lt('date', `${nextMonth}-01`),
      ])

      // 온통청년 주거지원 항목 분리 (주거 탭 전용)
      const housingKeywords = ['주거', '전세', '월세', '임대', '대출', '주택']
      const youthHousing = youthResult.data.filter(p =>
        housingKeywords.some(k => (p.category ?? '').includes(k) || (p.title ?? '').includes(k))
      )
      setYouthHousingPolicies(youthHousing)
      setPolicyPrograms([...youthResult.data, ...bok])
      setPolicyFallback(youthResult.isFallback)
      setFinancePrograms([...deposit, ...saving])
      setHousingNotices(housingResult.data)
      setHousingFallback(housingResult.isFallback)
      setEconomyIndicators(economyResult.data)
      setEconomyFallback(economyResult.isFallback)
      setExchangeRates(ratesResult.data)

      const salary = budgetData?.salary ?? 0
      const totalSavings = (allSavings ?? []).reduce((s, t) => s + t.amount, 0)
      const monthlySavings = (monthTx ?? []).filter(t => t.category === '저축').reduce((s, t) => s + t.amount, 0)
      // 주거비(월세) 지출 계산
      const rent = (monthTx ?? []).filter(t => t.category === '주거').reduce((s: number, t: any) => s + t.amount, 0)
      setMonthlyRent(rent)
      setUserMetrics({
        salary,
        monthlySavings,
        savingsRate: salary > 0 ? monthlySavings / salary : 0,
        totalSavings,
      })
    } finally {
      setLoading(false)
    }
  }

  const policyRecommend = getPolicyRecommend(userMetrics)
  const financeRecommend = getFinanceRecommend(userMetrics)
  const housingRecommend = getHousingRecommend(userMetrics)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>지원금 정보</Text>
          <Text style={styles.subtitle}>청년 맞춤 정책 · 금융 · 주거 · 경제</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContainer}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, selectedCategory === tab.key && styles.activeTab]}
            onPress={() => setSelectedCategory(tab.key)}
          >
            <Text style={[styles.tabText, selectedCategory === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : selectedCategory === 'economy' ? (
        <EconomyTab indicators={economyIndicators} rates={exchangeRates} indicatorsFallback={economyFallback} savingsRate={userMetrics.savingsRate} />
      ) : selectedCategory === 'housing' ? (
        <HousingTab
          notices={housingNotices}
          youthPolicies={youthHousingPolicies}
          navigation={navigation}
          isFallback={housingFallback}
          recommend={housingRecommend}
          salary={userMetrics.salary}
          monthlyRent={monthlyRent}
        />
      ) : (
        <FlatList
          data={selectedCategory === 'policy' ? policyPrograms : financePrograms}
          keyExtractor={(item, i) => item.id?.toString() ?? String(i)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {selectedCategory === 'policy' && policyRecommend && <RecommendCard {...policyRecommend} />}
              {selectedCategory === 'policy' && policyFallback && <FallbackBanner message="API 연동 작업 중 · 주요 청년 정책 기준값으로 표시" />}
              {selectedCategory === 'finance' && financeRecommend && <RecommendCard {...financeRecommend} />}
            </>
          }
          ListEmptyComponent={<Text style={styles.empty}>데이터를 불러오는 중이에요</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SupportDetail', { program: item })}
            >
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
              <Text style={styles.target}>대상: {item.target}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

// ── 주거 탭 ───────────────────────────────────────────────

const QUICK_LINKS = [
  { label: 'LH 청약센터', url: 'https://apply.lh.or.kr', icon: '🏢' },
  { label: '청약홈', url: 'https://www.applyhome.co.kr', icon: '🏠' },
  { label: '마이홈', url: 'https://www.myhome.go.kr', icon: '🏡' },
  { label: '버팀목대출', url: 'https://nhuf.molit.go.kr', icon: '💰' },
]

function HousingTab({ notices, youthPolicies, navigation, isFallback, recommend, salary, monthlyRent }: {
  notices: HousingNotice[]
  youthPolicies: any[]
  navigation: any
  isFallback: boolean
  recommend: { icon: string; title: string; body: string } | null
  salary: number
  monthlyRent: number
}) {
  const { Linking } = require('react-native')
  const rentRatio = salary > 0 ? Math.round(monthlyRent / salary * 100) : 0
  const rentStatus = rentRatio === 0 ? null
    : rentRatio <= 20 ? { label: '양호', color: '#059669', bg: '#ECFDF5' }
    : rentRatio <= 30 ? { label: '주의', color: '#D97706', bg: '#FFFBEB' }
    : { label: '과부담', color: '#EF4444', bg: '#FEF2F2' }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      {recommend && <RecommendCard {...recommend} />}

      {/* 주거비 부담률 */}
      {rentStatus && (
        <View style={[styles.rentCard, { backgroundColor: rentStatus.bg }]}>
          <View style={styles.rentRow}>
            <Text style={styles.rentLabel}>이번달 주거비 부담률</Text>
            <View style={[styles.rentBadge, { backgroundColor: rentStatus.color }]}>
              <Text style={styles.rentBadgeText}>{rentStatus.label}</Text>
            </View>
          </View>
          <Text style={[styles.rentRatio, { color: rentStatus.color }]}>{rentRatio}%</Text>
          <Text style={styles.rentSub}>
            월 주거비 {monthlyRent.toLocaleString()}원 / 월급 {salary.toLocaleString()}원
            {rentRatio > 30 ? ' · 권장 기준(30%) 초과예요' : ' · 권장 기준(30%) 이내예요'}
          </Text>
        </View>
      )}

      {/* 빠른 링크 */}
      <Text style={styles.sectionLabel}>바로가기</Text>
      <View style={styles.quickLinkRow}>
        {QUICK_LINKS.map(link => (
          <TouchableOpacity
            key={link.label}
            style={styles.quickLinkBtn}
            onPress={() => Linking.openURL(link.url)}
          >
            <Text style={styles.quickLinkIcon}>{link.icon}</Text>
            <Text style={styles.quickLinkText}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 온통청년 주거 정책 (실제 API 데이터) */}
      {youthPolicies.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>청년 주거 지원 정책</Text>
          <Text style={styles.sectionSub}>온통청년 API 실시간 데이터</Text>
          {youthPolicies.map((item, i) => (
            <TouchableOpacity
              key={item.id ?? i}
              style={styles.card}
              onPress={() => navigation.navigate('SupportDetail', { program: item })}
            >
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
              <Text style={styles.target}>대상: {item.target}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* LH 공공임대 */}
      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>LH 공공임대주택</Text>
      {isFallback
        ? <Text style={styles.sectionSub}>API 승인 대기 중 · 주요 프로그램 기준값</Text>
        : <Text style={styles.sectionSub}>LH 임대공고 실시간 데이터</Text>
      }
      {notices.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => navigation.navigate('SupportDetail', {
            program: {
              title: item.title, category: item.category,
              target: item.target, summary: item.summary,
              condition: `마감: ${item.deadline}`, benefit: item.region,
              link: item.link,
            }
          })}
        >
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.housingMeta}>
            <Text style={styles.metaItem}>📍 {item.region}</Text>
            <Text style={styles.metaItem}>📅 {item.deadline}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ── 경제 탭 AI 요약 생성 ──────────────────────────────────

function generateEconomySummary(indicators: EconomyIndicator[], savingsRate: number): string {
  const rate = indicators.find(i => i.name.includes('기준금리'))
  const cpi = indicators.find(i => i.name.includes('물가') || i.name.includes('CPI'))
  const unemp = indicators.find(i => i.name.includes('실업'))

  const rateVal = rate ? parseFloat(rate.value.replace(/,/g, '')) : null
  const cpiVal = cpi ? parseFloat(cpi.value.replace(/,/g, '')) : null
  const unempVal = unemp ? parseFloat(unemp.value.replace(/,/g, '')) : null

  const parts: string[] = []

  if (rateVal !== null) {
    if (rateVal >= 3.0) parts.push(`기준금리가 ${rateVal}%로 높은 수준이에요`)
    else if (rateVal >= 1.5) parts.push(`기준금리가 ${rateVal}%로 보통 수준이에요`)
    else parts.push(`기준금리가 ${rateVal}%로 낮은 편이에요`)
  }

  if (cpiVal !== null) {
    if (cpiVal >= 3.0) parts.push(`소비자물가 상승률이 ${cpiVal}%로 높아 구매력이 낮아지고 있어요`)
    else if (cpiVal >= 2.0) parts.push(`물가가 ${cpiVal}% 올라 소폭 상승 중이에요`)
    else parts.push(`물가가 ${cpiVal}%로 안정적이에요`)
  }

  if (unempVal !== null) {
    if (unempVal >= 4.0) parts.push(`실업률이 ${unempVal}%로 다소 높아요`)
    else parts.push(`실업률은 ${unempVal}%로 안정적이에요`)
  }

  const isHighRate = rateVal !== null && rateVal >= 3.0
  const isHighCpi = cpiVal !== null && cpiVal >= 3.0

  let advice: string
  if (isHighRate && isHighCpi) {
    advice = savingsRate >= 0.2
      ? '예적금 금리가 높으니 단기 고금리 예금을 활용하고, 물가 헤지를 위해 배당 ETF 비중도 일부 유지하세요.'
      : '지출을 줄여 저축률부터 높이는 게 우선이에요. 예적금 금리가 높으니 자동이체 적금부터 시작해보세요.'
  } else if (isHighRate) {
    advice = '예적금이 유리한 시기예요. 고금리 정기예금이나 채권 ETF로 안정적인 수익을 챙겨보세요.'
  } else if (isHighCpi) {
    advice = '물가 상승이 지속되면 현금 가치가 떨어져요. 주식형 ETF나 실물 자산으로 분산하는 게 도움이 돼요.'
  } else {
    advice = '경제 지표가 전반적으로 안정적이에요. 예금과 ETF를 균형 있게 배분하는 포트폴리오가 적합해요.'
  }

  const intro = parts.length > 0 ? parts.join(', ') + '.' : '현재 경제 지표를 분석했어요.'
  return `${intro} ${advice}`
}

// ── 경제 탭 ───────────────────────────────────────────────

function EconomyTab({ indicators, rates, indicatorsFallback, savingsRate }: {
  indicators: EconomyIndicator[]
  rates: ExchangeRate[]
  indicatorsFallback: boolean
  savingsRate: number
}) {
  const summary = indicators.length > 0 ? generateEconomySummary(indicators, savingsRate) : null

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      {summary ? (
        <View style={styles.aiMsgCard}>
          <View style={styles.aiMsgHeader}>
            <View style={styles.aiMsgAvatar}>
              <Ionicons name="sparkles" size={12} color="#7C3AED" />
            </View>
            <Text style={styles.aiMsgLabel}>AI 경제 해석</Text>
          </View>
          <Text style={styles.aiMsgText}>{summary}</Text>
        </View>
      ) : (
        <View style={styles.aiBanner}>
          <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
          <Text style={styles.aiBannerText}>경제 지표를 불러오는 중이에요</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>주요 경제지표</Text>
      <Text style={styles.economyDesc}>한국은행 ECOS 기준</Text>
      {indicatorsFallback && <FallbackBanner message="API 연동 작업 중 · 한국은행 ECOS 기준값으로 표시" />}
      {indicators.map(item => (
        <View key={item.id} style={styles.econCard}>
          <View style={styles.econLeft}>
            <Text style={styles.econIcon}>{getEconomyIcon(item.name)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.econName}>{item.name}</Text>
              <Text style={styles.econTime}>{item.time} 기준</Text>
            </View>
          </View>
          <View style={styles.econRight}>
            <Text style={styles.econValue}>{item.value}<Text style={styles.econUnit}>{item.unit}</Text></Text>
          </View>
          <View style={styles.interpretRow}>
            <Ionicons name="bulb-outline" size={13} color="#2563EB" />
            <Text style={styles.interpretText}>{getEconomyInterpretation(item.name, item.value, savingsRate)}</Text>
          </View>
        </View>
      ))}

      {rates.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>실시간 환율</Text>
          <Text style={styles.economyDesc}>한국은행 ECOS 기준 · 1원 기준 환산</Text>
          <View style={styles.rateGrid}>
            {rates.map(r => (
              <View key={r.code} style={styles.rateCard}>
                <Text style={styles.rateFlag}>{r.flag}</Text>
                <Text style={styles.rateCode}>{r.code}</Text>
                <Text style={styles.rateCurrency}>{r.currency}</Text>
                <Text style={styles.rateValue}>{r.rate}<Text style={styles.rateUnit}>원</Text></Text>
                {r.isFallback
                  ? <Text style={styles.rateFallback}>참고값</Text>
                  : <Text style={styles.rateTime}>{r.time} 기준</Text>
                }
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

// ── 스타일 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  tabScroll: { flexGrow: 0, marginBottom: 14 },
  tabContainer: { flexDirection: 'row', gap: 8, paddingRight: 16, paddingVertical: 4 },
  tabButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E5E7EB', minHeight: 40, justifyContent: 'center' },
  activeTab: { backgroundColor: '#2563EB' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280', lineHeight: 20 },
  activeTabText: { color: '#fff' },
  list: { paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F0FE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  categoryText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardSummary: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  target: { fontSize: 12, color: '#9CA3AF' },
  housingMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { fontSize: 12, color: '#6B7280' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },
  rentCard: { borderRadius: 16, padding: 16, marginBottom: 14 },
  rentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  rentLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  rentBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rentBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  rentRatio: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  rentSub: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  quickLinkRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  quickLinkBtn: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, minWidth: 72 },
  quickLinkIcon: { fontSize: 20, marginBottom: 4 },
  quickLinkText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  fallbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
  fallbackText: { fontSize: 12, color: '#D97706', fontWeight: '500', flex: 1 },
  recommendCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  recommendIcon: { fontSize: 28 },
  recommendTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  recommendBody: { fontSize: 12, color: '#3B82F6', lineHeight: 18 },
  aiBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E8FF', borderRadius: 12, padding: 12, marginBottom: 14 },
  aiBannerText: { fontSize: 12, color: '#7C3AED', fontWeight: '500', flex: 1 },
  aiMsgCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
  aiMsgHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiMsgAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
  aiMsgLabel: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  aiMsgText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  economyDesc: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  econCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  econLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  econIcon: { fontSize: 26 },
  econName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  econTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  econRight: { position: 'absolute', right: 16, top: 16 },
  econValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  econUnit: { fontSize: 13, fontWeight: '400', color: '#6B7280' },
  interpretRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10 },
  interpretText: { fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 18 },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rateCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, alignItems: 'flex-start' },
  rateFlag: { fontSize: 28, marginBottom: 6 },
  rateCode: { fontSize: 13, fontWeight: '700', color: '#111827' },
  rateCurrency: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  rateValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  rateUnit: { fontSize: 12, fontWeight: '400', color: '#6B7280' },
  rateTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  rateFallback: { fontSize: 10, color: '#D97706', fontWeight: '600', marginTop: 4 },
})
