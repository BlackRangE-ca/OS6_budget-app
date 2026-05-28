import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { fetchDepositProducts, fetchSavingProducts } from '../lib/financeApi'
import { fetchTopETFs, ETFProduct } from '../lib/krxApi'
import { fetchKeyStatistics, EconomyIndicator } from '../lib/economyApi'

// ── 타입 ──────────────────────────────────────────────────

type Step = 'bank' | 'quiz' | 'result'

type RiskType = '보수형' | '안정형' | '중립형' | '성장형' | '공격형'

type Product = { name: string; desc: string; tag: string; tagColor: string }

// ── 상수 ──────────────────────────────────────────────────

const BANKS = [
  'KB국민', '신한', '하나', '우리', 'NH농협',
  '카카오뱅크', '토스뱅크', 'IBK기업', '기타',
]

const QUIZ: { q: string; options: string[] }[] = [
  {
    q: '투자 목적은 무엇인가요?',
    options: ['원금 보전이 최우선이에요', '안전하면서 적당한 수익을 원해요', '높은 수익을 위해 위험을 감수할게요'],
  },
  {
    q: '투자 기간을 얼마나 생각하세요?',
    options: ['1년 이내 (언제든 출금 가능해야 해요)', '1~3년 (어느 정도 묶어둘 수 있어요)', '3년 이상 (장기로 운용할 거예요)'],
  },
  {
    q: '투자 손실이 발생한다면?',
    options: ['바로 팔아서 더 이상 잃지 않을 거예요', '1~2달 기다려볼 수 있어요', '오히려 더 투자할 기회로 삼겠어요'],
  },
]

const RISK_INFO: Record<RiskType, { color: string; bg: string; icon: string; desc: string; alloc: { label: string; ratio: number; color: string }[] }> = {
  보수형: {
    color: '#2563EB', bg: '#EFF6FF', icon: '🛡️',
    desc: '원금 보전 중심. 예·적금과 채권형 상품이 적합해요.',
    alloc: [{ label: '예적금', ratio: 80, color: '#2563EB' }, { label: '채권ETF', ratio: 15, color: '#7C3AED' }, { label: '기타', ratio: 5, color: '#D1D5DB' }],
  },
  안정형: {
    color: '#059669', bg: '#ECFDF5', icon: '🌿',
    desc: '안정적 수익 추구. 예금에 배당·채권 ETF를 일부 섞는 방식이 좋아요.',
    alloc: [{ label: '예적금', ratio: 60, color: '#059669' }, { label: '배당ETF', ratio: 25, color: '#2563EB' }, { label: '채권ETF', ratio: 15, color: '#7C3AED' }],
  },
  중립형: {
    color: '#D97706', bg: '#FFFBEB', icon: '⚖️',
    desc: '예금과 주식형 ETF를 균형 있게 배분하는 포트폴리오가 맞아요.',
    alloc: [{ label: '예적금', ratio: 45, color: '#D97706' }, { label: '국내ETF', ratio: 25, color: '#059669' }, { label: '해외ETF', ratio: 30, color: '#2563EB' }],
  },
  성장형: {
    color: '#7C3AED', bg: '#F3E8FF', icon: '🚀',
    desc: '성장 중심 포트폴리오. ETF 비중을 높이고 예금은 비상금 수준으로 유지해요.',
    alloc: [{ label: '해외ETF', ratio: 45, color: '#7C3AED' }, { label: '국내ETF', ratio: 25, color: '#2563EB' }, { label: '예적금', ratio: 30, color: '#D97706' }],
  },
  공격형: {
    color: '#EF4444', bg: '#FEF2F2', icon: '⚡',
    desc: '고수익 추구형. ETF 집중 투자와 섹터 테마 상품을 활용해요.',
    alloc: [{ label: '해외ETF', ratio: 40, color: '#EF4444' }, { label: '섹터ETF', ratio: 30, color: '#7C3AED' }, { label: '국내ETF', ratio: 20, color: '#2563EB' }, { label: '예적금', ratio: 10, color: '#D97706' }],
  },
}

function calcRisk(answers: number[]): RiskType {
  const score = answers.reduce((a, b) => a + b, 0)
  if (score <= 1) return '보수형'
  if (score <= 3) return '안정형'
  if (score === 4) return '중립형'
  if (score === 5) return '성장형'
  return '공격형'
}

// 은행별 대표 상품
const BANK_FLAGSHIP: Record<string, { name: string; desc: string }> = {
  'KB국민':    { name: 'KB스타 정기예금',        desc: 'KB스타뱅킹 비대면 가입 시 최고 우대금리. KB증권 ISA 연동 가능' },
  '신한':      { name: '신한 쏠편한 정기예금',   desc: '신한 SOL 앱 전용 최고금리. 만기 자동 재예치 설정 가능' },
  '하나':      { name: '하나 더쉬운 정기예금',   desc: '하나원큐 앱 비대면 우대금리. 하나증권 계좌 연동 가능' },
  '우리':      { name: '우리 WON플러스 예금',    desc: '우리WON뱅킹 전용. 자동이체 우대 조건 확인 후 가입' },
  'NH농협':    { name: 'NH 왈츠 회전정기예금',   desc: 'NH스마트뱅킹 전용. 3개월 회전으로 금리 변동 대응' },
  '카카오뱅크': { name: '카카오뱅크 정기예금',   desc: '앱 즉시 가입, 최고금리 자동 적용. 세이프박스 파킹통장 병행 추천' },
  '토스뱅크':  { name: '토스뱅크 정기예금',      desc: '토스증권과 한 앱에서 ETF·예금 통합 관리 가능' },
  'IBK기업':   { name: 'IBK 직장인 우대적금',    desc: '중소기업 재직자 한정 우대금리. 청년내일채움공제와 병행 가능' },
  '기타':      { name: '주거래 은행 정기예금',   desc: '앱 비대면 가입 시 금리 우대 여부 먼저 확인하세요' },
}

// 은행→API 데이터 매칭 키워드
const BANK_KEYWORDS: Record<string, string[]> = {
  'KB국민': ['국민', 'KB'], '신한': ['신한'], '하나': ['하나'], '우리': ['우리'],
  'NH농협': ['농협', 'NH'], '카카오뱅크': ['카카오'], '토스뱅크': ['토스'],
  'IBK기업': ['기업', 'IBK'], '기타': [],
}

// 성향별 정책·절세 상품
const RISK_POLICY: Record<RiskType, Product[]> = {
  보수형: [
    { name: '청년도약계좌', desc: '정부 기여금 최대 월 2.4만원 + 비과세. 5년 만기 최대 5,000만원', tag: '정책', tagColor: '#7C3AED' },
    { name: '청년내일채움공제', desc: '2년 만기 1,200만원 (본인 400 + 기업·정부 800만원)', tag: '정책', tagColor: '#7C3AED' },
  ],
  안정형: [
    { name: '청년도약계좌', desc: '정부 기여금 포함 연 8%+ 효과. 5년 목돈 마련', tag: '정책', tagColor: '#7C3AED' },
    { name: 'ISA 중개형', desc: '연 200만원 비과세 + 초과분 9.9% 분리과세. 예금·ETF 통합', tag: '절세', tagColor: '#D97706' },
  ],
  중립형: [
    { name: 'ISA 중개형', desc: '예금+ETF를 한 계좌로. 연 200만원 비과세 한도 활용', tag: '절세', tagColor: '#D97706' },
    { name: '청년도약계좌', desc: '목돈의 일부를 장기 적립. 정부 기여금 수령', tag: '정책', tagColor: '#7C3AED' },
  ],
  성장형: [
    { name: 'ISA 중개형', desc: 'ETF 수익 비과세·분리과세. ETF 투자 시 반드시 활용', tag: '절세', tagColor: '#D97706' },
    { name: '연금저축펀드', desc: '연 600만원 세액공제 16.5%. ETF 장기 투자 가능', tag: '절세', tagColor: '#D97706' },
  ],
  공격형: [
    { name: 'ISA 중개형', desc: 'ETF 집중투자 수익의 세금 최소화. 필수 계좌', tag: '절세', tagColor: '#EF4444' },
    { name: '연금저축펀드', desc: '세액공제 + 나스닥·테마 ETF 장기 운용', tag: '절세', tagColor: '#7C3AED' },
  ],
}

function getBankAdvice(bank: string, risk: RiskType): string {
  const flagship = BANK_FLAGSHIP[bank] ?? BANK_FLAGSHIP['기타']
  const etfSuffix = (risk === '성장형' || risk === '공격형')
    ? ' ETF는 키움·미래에셋 등 증권사 앱을 별도로 활용하는 게 수수료 면에서 유리해요.'
    : ''
  return `${flagship.desc}${etfSuffix}`
}

function getDepositProducts(raw: any[], risk: RiskType, bank: string): Product[] {
  const flagship = BANK_FLAGSHIP[bank] ?? BANK_FLAGSHIP['기타']
  const keywords = BANK_KEYWORDS[bank] ?? []
  const policy = RISK_POLICY[risk]

  // 주거래 은행 대표 상품은 항상 첫 번째로 표시
  const flagshipProduct: Product = {
    name: flagship.name,
    desc: flagship.desc,
    tag: '주거래',
    tagColor: '#2563EB',
  }

  if (raw.length > 0 && keywords.length > 0) {
    // 금감원 실데이터에서 선택 은행 상품 검색 (이름·은행명 모두 확인)
    const mine = raw.filter(p =>
      keywords.some(k =>
        (p.target ?? '').includes(k) || (p.title ?? '').includes(k)
      )
    )

    if (mine.length > 0) {
      // API에서 해당 은행 상품 발견: 최고금리 순으로 1개 + 정책 상품
      const best = mine.sort((a, b) => {
        const ra = parseFloat((a.benefit ?? '').match(/최고금리\s*([\d.]+)/)?.[1] ?? '0')
        const rb = parseFloat((b.benefit ?? '').match(/최고금리\s*([\d.]+)/)?.[1] ?? '0')
        return rb - ra
      })[0]

      return [
        flagshipProduct,
        { name: best.title, desc: best.benefit ?? best.summary ?? '', tag: '금감원', tagColor: '#6B7280' },
        policy[0],
      ]
    }
  }

  // Fallback: 주거래 은행 대표 상품 + 성향별 정책 상품
  return [flagshipProduct, ...policy]
}

// 성향별 ETF 추천 (명시적 리스트)
const RISK_ETF_LIST: Record<RiskType, Product[]> = {
  보수형: [
    { name: 'KOSEF 국고채10년', desc: '채권형 ETF. 주가 하락 시 방어력 우수. 안정적 이자수익 추구', tag: '채권', tagColor: '#059669' },
    { name: 'ACE 미국배당다우존스', desc: '미국 고배당주. 분기 배당금 수령 가능. 변동성 낮고 안정적', tag: '배당', tagColor: '#2563EB' },
    { name: 'KODEX 200', desc: '코스피 200 추종. 국내 대형주 분산. 장기 보유에 적합', tag: '국내주식', tagColor: '#6B7280' },
  ],
  안정형: [
    { name: 'KODEX 200', desc: '코스피 200. 국내 주식 ETF 중 가장 안정적인 분산투자', tag: '국내주식', tagColor: '#2563EB' },
    { name: 'ACE 미국배당다우존스', desc: '미국 배당주. 환율 분산 효과 + 분기 배당 수령', tag: '배당', tagColor: '#059669' },
    { name: 'KOSEF 국고채10년', desc: '채권 비중으로 포트폴리오 전체 변동성을 낮춰요', tag: '채권', tagColor: '#6B7280' },
  ],
  중립형: [
    { name: 'TIGER 미국S&P500', desc: '미국 S&P500. 글로벌 분산투자의 핵심. 장기 우상향 기대', tag: '해외주식', tagColor: '#7C3AED' },
    { name: 'KODEX 200', desc: '국내 대형주. 해외 ETF와 함께 국내+해외 균형 포트폴리오', tag: '국내주식', tagColor: '#2563EB' },
    { name: 'ACE 미국배당다우존스', desc: '배당 수익으로 포트폴리오 안정성 추가', tag: '배당', tagColor: '#059669' },
  ],
  성장형: [
    { name: 'TIGER 미국나스닥100', desc: '애플·엔비디아·마이크로소프트 등 빅테크 집중. 장기 성장 기대', tag: '해외주식', tagColor: '#7C3AED' },
    { name: 'TIGER 미국S&P500', desc: 'S&P500으로 기술주 집중 리스크 완화. 핵심 보유 ETF', tag: '해외주식', tagColor: '#7C3AED' },
    { name: 'KODEX 반도체', desc: 'AI·반도체 섹터 집중. 높은 변동성 감수 시 기대수익 높음', tag: '섹터', tagColor: '#EF4444' },
  ],
  공격형: [
    { name: 'TIGER 미국나스닥100', desc: '나스닥100 빅테크 집중. 성장주 공격 포트폴리오 핵심', tag: '해외주식', tagColor: '#EF4444' },
    { name: 'KODEX 반도체', desc: 'AI·반도체 테마. 단기 고변동성 감수 시 기대수익 최고', tag: '섹터', tagColor: '#7C3AED' },
    { name: 'KODEX 코스닥150', desc: '코스닥 상위 150종목. 국내 성장주 집중 투자', tag: '국내성장', tagColor: '#2563EB' },
  ],
}

function getEtfProducts(_etfs: ETFProduct[], risk: RiskType): Product[] {
  return RISK_ETF_LIST[risk]
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

export default function InvestmentRecommendationScreen() {
  const navigation = useNavigation()

  const [step, setStep] = useState<Step>('bank')
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [quizIdx, setQuizIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  const [loading, setLoading] = useState(false)
  const [deposits, setDeposits] = useState<any[]>([])
  const [etfs, setEtfs] = useState<ETFProduct[]>([])
  const [etfFallback, setEtfFallback] = useState(false)
  const [totalAsset, setTotalAsset] = useState(0)
  const [investableAmount, setInvestableAmount] = useState(0)
  const [monthlyInvestable, setMonthlyInvestable] = useState(0)
  const [productTab, setProductTab] = useState<'deposit' | 'etf' | 'simulate'>('deposit')
  const [economyIndicators, setEconomyIndicators] = useState<EconomyIndicator[]>([])
  const [aiRecommendation, setAiRecommendation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [riskHistory, setRiskHistory] = useState<{ risk_type: string; created_at: string }[]>([])
  const [simulateMonthly, setSimulateMonthly] = useState(0)

  const riskType = calcRisk(answers)

  async function loadProducts(finalAnswers: number[] = answers) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

      const [depositRes, savingRes, etfRes, econRes] = await Promise.all([
        fetchDepositProducts().catch(() => []),
        fetchSavingProducts().catch(() => []),
        fetchTopETFs(),
        fetchKeyStatistics().catch(() => ({ data: [], isFallback: true })),
      ])
      setDeposits([...depositRes, ...savingRes])
      setEtfs(etfRes.data)
      setEtfFallback(etfRes.isFallback)
      setEconomyIndicators(econRes.data)

      if (user) {
        const [assetRes, budgetRes, txRes, historyRes] = await Promise.all([
          supabase.from('assets').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).single(),
          supabase.from('budgets').select('salary, amount').eq('user_id', user.id).eq('month', thisMonth).single(),
          supabase.from('transactions').select('amount, category, type').eq('user_id', user.id)
            .gte('date', `${thisMonth}-01`).lt('date', `${nextMonth}-01`),
          supabase.from('risk_profiles').select('risk_type, created_at').eq('user_id', user.id)
            .order('created_at', { ascending: false }).limit(5),
        ])

        const assetData = assetRes.data
        if (assetData) {
          setTotalAsset((assetData.deposit ?? 0) + (assetData.savings ?? 0) + (assetData.stock ?? 0) + (assetData.insurance ?? 0) + (assetData.other ?? 0))
        }

        // 투자 가능 금액: 총자산 - 비상금(3개월 생활비)
        const salary = budgetRes.data?.salary ?? 0
        const monthlyExpense = (txRes.data ?? []).filter((t: any) => t.type !== 'income').reduce((s: number, t: any) => s + t.amount, 0)
        const emergencyFund = monthlyExpense * 3
        const assetTotal = assetData ? (assetData.deposit ?? 0) + (assetData.savings ?? 0) + (assetData.stock ?? 0) + (assetData.insurance ?? 0) + (assetData.other ?? 0) : 0
        const investable = Math.max(0, assetTotal - emergencyFund)
        setInvestableAmount(investable)

        // 월 투자 가능 금액: 월급 - 지출 - 비상금 적립분
        const monthlySpend = monthlyExpense
        const monthlySavable = Math.max(0, salary - monthlySpend)
        const emergencyMonthly = emergencyFund > 0 && assetTotal < emergencyFund ? Math.min(monthlySavable * 0.5, emergencyFund / 6) : 0
        setMonthlyInvestable(Math.max(0, Math.round(monthlySavable - emergencyMonthly)))
        setSimulateMonthly(Math.max(0, Math.round(monthlySavable - emergencyMonthly)))

        setRiskHistory(historyRes.data ?? [])

        // 성향 저장
        await supabase.from('risk_profiles').insert({
          user_id: user.id,
          risk_type: calcRisk(finalAnswers),
          quiz_score: finalAnswers.reduce((a, b) => a + b, 0),
          selected_bank: selectedBank,
        })

        // AI 동적 추천 (백그라운드)
        generateAiRecommendation(finalAnswers, salary, monthlyExpense, assetData, econRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function generateAiRecommendation(
    finalAnswers: number[],
    salary: number,
    monthlyExpense: number,
    assetData: any,
    indicators: EconomyIndicator[],
  ) {
    setAiLoading(true)
    try {
      const riskType = calcRisk(finalAnswers)
      const bank = selectedBank ?? '미선택'
      const assetTotal = assetData ? (assetData.deposit ?? 0) + (assetData.savings ?? 0) + (assetData.stock ?? 0) : 0
      const indicatorStr = indicators.map(i => `${i.name} ${i.value}${i.unit}`).join(', ')
      const systemPrompt =
        `당신은 투자 전문가입니다. 사용자 데이터를 보고 맞춤 투자 조언을 3~4문장으로 작성하세요.\n` +
        `규칙: 한글만 사용, 영어/한자 금지. 구체적 금액과 상품명을 포함하세요.`
      const userMsg =
        `투자성향: ${riskType} / 주거래은행: ${bank}\n` +
        `월수입: ${salary.toLocaleString()}원 / 월지출: ${monthlyExpense.toLocaleString()}원\n` +
        `현재자산: ${assetTotal.toLocaleString()}원\n` +
        `경제지표: ${indicatorStr || '정보 없음'}\n` +
        `위 데이터 기반으로 이 사용자에게 맞는 투자 전략을 조언해주세요.`

      const { data, error } = await supabase.functions.invoke('hf-proxy', {
        body: { action: 'generate', systemPrompt, messages: [{ role: 'user', content: userMsg }] },
      })
      if (!error && data?.text) {
        const clean = (data.text as string).replace(/[一-鿿㐀-䶿豈-﫿]+/g, '').replace(/ {2,}/g, ' ').trim()
        setAiRecommendation(clean)
      }
    } catch { }
    setAiLoading(false)
  }

  function handleBankNext() {
    if (!selectedBank) return
    setStep('quiz')
  }

  function handleAnswer(score: number) {
    const next = [...answers, score]
    setAnswers(next)
    if (quizIdx < QUIZ.length - 1) {
      setQuizIdx(quizIdx + 1)
    } else {
      loadProducts(next)
      setStep('result')
    }
  }

  function reset() {
    setStep('bank')
    setSelectedBank(null)
    setQuizIdx(0)
    setAnswers([])
    setProductTab('deposit')
  }

  const info = RISK_INFO[riskType]
  const depositProducts = getDepositProducts(deposits, riskType, selectedBank ?? '기타')
  const etfProducts = getEtfProducts(etfs, riskType)

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => step === 'bank' ? navigation.goBack() : reset()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투자 성향 분석</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 진행 표시 */}
      <View style={styles.progressRow}>
        {(['bank', 'quiz', 'result'] as Step[]).map((s, i) => (
          <View key={s} style={[styles.progressDot, step === s && styles.progressDotActive,
            (['bank', 'quiz', 'result'] as Step[]).indexOf(step) > i && styles.progressDotDone]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Step 1: 은행 선택 ─────────────────────────── */}
        {step === 'bank' && (
          <View style={styles.stepWrap}>
            <Text style={styles.stepLabel}>STEP 1</Text>
            <Text style={styles.stepTitle}>주거래 은행을 선택해주세요</Text>
            <Text style={styles.stepSub}>선택한 은행의 특판 상품 정보를 함께 안내해드려요</Text>

            <View style={styles.bankGrid}>
              {BANKS.map(bank => (
                <TouchableOpacity
                  key={bank}
                  style={[styles.bankChip, selectedBank === bank && styles.bankChipActive]}
                  onPress={() => setSelectedBank(bank)}
                >
                  <Text style={[styles.bankChipText, selectedBank === bank && styles.bankChipTextActive]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, !selectedBank && styles.nextBtnDisabled]}
              onPress={handleBankNext}
              disabled={!selectedBank}
            >
              <Text style={styles.nextBtnText}>다음</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: 퀴즈 ──────────────────────────────── */}
        {step === 'quiz' && (
          <View style={styles.stepWrap}>
            <Text style={styles.stepLabel}>STEP 2 · {quizIdx + 1}/{QUIZ.length}</Text>
            <Text style={styles.stepTitle}>{QUIZ[quizIdx].q}</Text>

            <View style={styles.quizOptions}>
              {QUIZ[quizIdx].options.map((opt, i) => (
                <TouchableOpacity key={i} style={styles.quizOption} onPress={() => handleAnswer(i)}>
                  <View style={styles.quizOptionNum}>
                    <Text style={styles.quizOptionNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.quizOptionText}>{opt}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 3: 결과 ──────────────────────────────── */}
        {step === 'result' && (
          <View style={styles.stepWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>맞춤 상품 분석 중...</Text>
              </View>
            ) : (
              <>
                {/* 성향 배지 */}
                <View style={[styles.riskBadge, { backgroundColor: info.bg }]}>
                  <Text style={styles.riskBadgeEmoji}>{info.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.riskBadgeType, { color: info.color }]}>{riskType}</Text>
                    <Text style={styles.riskBadgeDesc}>{info.desc}</Text>
                  </View>
                </View>

                {/* 자산·투자 가능 금액 */}
                <View style={styles.assetRow}>
                  <Ionicons name="wallet-outline" size={14} color="#6B7280" />
                  <Text style={styles.assetText}>
                    {totalAsset > 0 ? `현재 자산 ${totalAsset.toLocaleString()}원` : '자산 정보 없음'}
                    {investableAmount > 0 ? ` · 투자 가능 ${investableAmount.toLocaleString()}원` : ''}
                    {monthlyInvestable > 0 ? ` · 월 투자 여력 ${monthlyInvestable.toLocaleString()}원` : ''}
                  </Text>
                </View>

                {/* 경제지표 투자 타이밍 */}
                {economyIndicators.length > 0 && (() => {
                  const rate = economyIndicators.find(i => i.name.includes('기준금리'))
                  const cpi = economyIndicators.find(i => i.name.includes('물가'))
                  const rateVal = parseFloat(rate?.value ?? '0')
                  const cpiVal = parseFloat(cpi?.value ?? '0')
                  const isHighRate = rateVal >= 3.0
                  const isHighCpi = cpiVal >= 3.0
                  const msg = isHighRate && isHighCpi
                    ? `금리 ${rateVal}% · 물가 ${cpiVal}% → 예적금 비중 높이고 인플레 헤지 자산 고려`
                    : isHighRate
                    ? `금리 ${rateVal}% 고금리 → 예적금·채권ETF 수익률이 유리한 시기`
                    : isHighCpi
                    ? `물가 ${cpiVal}% 상승 → 현금 비중 줄이고 실물·주식 자산 분산 추천`
                    : `금리 ${rateVal}% · 물가 ${cpiVal}% → 예금과 ETF 균형 배분 적정`
                  return (
                    <View style={styles.econTip}>
                      <Ionicons name="trending-up-outline" size={13} color="#059669" />
                      <Text style={styles.econTipText}>현재 경제 상황: {msg}</Text>
                    </View>
                  )
                })()}

                {/* 포트폴리오 배분 */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>권장 포트폴리오 배분</Text>
                  <View style={styles.allocBar}>
                    {info.alloc.map(a => (
                      <View key={a.label} style={[styles.allocSeg, { flex: a.ratio, backgroundColor: a.color }]} />
                    ))}
                  </View>
                  <View style={styles.allocLegend}>
                    {info.alloc.map(a => (
                      <View key={a.label} style={styles.allocLegendItem}>
                        <View style={[styles.allocDot, { backgroundColor: a.color }]} />
                        <Text style={styles.allocLegendText}>{a.label} {a.ratio}%</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 주거래 은행 팁 */}
                <View style={styles.bankTip}>
                  <Ionicons name="business-outline" size={14} color="#2563EB" />
                  <Text style={styles.bankTipText}>{getBankAdvice(selectedBank!, riskType)}</Text>
                </View>

                {/* 추천 상품 탭 */}
                <View style={styles.productTabRow}>
                  {(['deposit', 'etf', 'simulate'] as const).map(tab => (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.productTab, productTab === tab && styles.productTabActive]}
                      onPress={() => setProductTab(tab)}
                    >
                      <Text style={[styles.productTabText, productTab === tab && styles.productTabTextActive]}>
                        {tab === 'deposit' ? '예·적금' : tab === 'etf' ? 'ETF' : '시뮬레이션'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {productTab === 'deposit' && depositProducts.map((p, i) => (
                  <View key={i} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productName}>{p.name}</Text>
                      <View style={[styles.productTag, { backgroundColor: p.tagColor + '20' }]}>
                        <Text style={[styles.productTagText, { color: p.tagColor }]}>{p.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.productDesc}>{p.desc}</Text>
                  </View>
                ))}

                {productTab === 'etf' && (
                  <>
                    {etfFallback && (
                      <View style={styles.fallbackBanner}>
                        <Ionicons name="construct-outline" size={13} color="#D97706" />
                        <Text style={styles.fallbackText}>KRX API 연동 작업 중 · 순자산 상위 ETF 기준값으로 표시</Text>
                      </View>
                    )}
                    {etfProducts.map((p, i) => {
                      const liveEtf = etfs.find(e => e.name.includes(p.name.split(' ')[0]))
                      return (
                        <View key={i} style={styles.productCard}>
                          <View style={styles.productHeader}>
                            <Text style={styles.productName}>{p.name}</Text>
                            <View style={[styles.productTag, { backgroundColor: p.tagColor + '20' }]}>
                              <Text style={[styles.productTagText, { color: p.tagColor }]}>{p.tag}</Text>
                            </View>
                          </View>
                          <Text style={styles.productDesc}>{p.desc}</Text>
                          {liveEtf && (
                            <View style={styles.etfPriceRow}>
                              <Text style={styles.etfPrice}>{liveEtf.price.toLocaleString()}원</Text>
                              <Text style={[styles.etfChange, { color: liveEtf.change >= 0 ? '#059669' : '#EF4444' }]}>
                                {liveEtf.change >= 0 ? '▲' : '▼'}{Math.abs(liveEtf.change)}%
                              </Text>
                              <Text style={styles.etfAum}>순자산 {liveEtf.aum.toLocaleString()}억</Text>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </>
                )}

                {productTab === 'simulate' && (() => {
                  const monthly = simulateMonthly > 0 ? simulateMonthly : 100000
                  const RATE: Record<RiskType, number> = { 보수형: 0.03, 안정형: 0.05, 중립형: 0.07, 성장형: 0.09, 공격형: 0.11 }
                  const annualRate = RATE[riskType]
                  const calc = (years: number) => {
                    const months = years * 12
                    const r = annualRate / 12
                    return Math.round(monthly * ((Math.pow(1 + r, months) - 1) / r))
                  }
                  const results = [{ y: 1, label: '1년' }, { y: 3, label: '3년' }, { y: 5, label: '5년' }]
                  return (
                    <View>
                      <View style={styles.simulateHeader}>
                        <Text style={styles.simulateTitle}>월 {monthly.toLocaleString()}원 적립 시</Text>
                        <Text style={styles.simulateSub}>{riskType} 기대 수익률 연 {(annualRate * 100).toFixed(0)}% 기준</Text>
                      </View>
                      {results.map(r => (
                        <View key={r.y} style={styles.simulateRow}>
                          <Text style={styles.simulateYear}>{r.label} 후</Text>
                          <View style={styles.simulateBar}>
                            <View style={[styles.simulateBarFill, {
                              width: `${Math.min(100, (calc(r.y) / calc(5)) * 100)}%` as any,
                              backgroundColor: info.color,
                            }]} />
                          </View>
                          <Text style={[styles.simulateAmount, { color: info.color }]}>{calc(r.y).toLocaleString()}원</Text>
                        </View>
                      ))}
                      <Text style={styles.simulateDisclaimer}>* 복리 계산 기준 · 실제 수익률은 시장 상황에 따라 다를 수 있어요</Text>
                    </View>
                  )
                })()}

                {/* AI 동적 추천 */}
                <View style={styles.aiCard}>
                  <View style={styles.aiCardHeader}>
                    <Ionicons name="sparkles" size={14} color="#7C3AED" />
                    <Text style={styles.aiCardTitle}>AI 맞춤 투자 조언</Text>
                  </View>
                  {aiLoading
                    ? <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 8 }} />
                    : aiRecommendation
                      ? <Text style={styles.aiCardText}>{aiRecommendation}</Text>
                      : <Text style={styles.aiCardEmpty}>데이터를 분석 중이에요...</Text>
                  }
                </View>

                {/* 성향 히스토리 */}
                {riskHistory.length > 1 && (
                  <View style={styles.historyCard}>
                    <Text style={styles.historyTitle}>나의 성향 변화</Text>
                    {riskHistory.slice(0, 4).map((h, i) => {
                      const d = new Date(h.created_at)
                      const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
                      return (
                        <View key={i} style={styles.historyRow}>
                          <Text style={styles.historyDate}>{label}</Text>
                          <View style={[styles.historyBadge, { backgroundColor: (RISK_INFO[h.risk_type as RiskType]?.bg ?? '#F3F4F6') }]}>
                            <Text style={[styles.historyType, { color: RISK_INFO[h.risk_type as RiskType]?.color ?? '#6B7280' }]}>
                              {h.risk_type}
                            </Text>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}

                {/* 다시하기 */}
                <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                  <Ionicons name="refresh-outline" size={16} color="#7C3AED" />
                  <Text style={styles.retryText}>다시 분석하기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 16 : 0, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#fff' },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  progressDotActive: { width: 24, backgroundColor: '#7C3AED' },
  progressDotDone: { backgroundColor: '#7C3AED', opacity: 0.4 },
  stepWrap: { padding: 20 },
  stepLabel: { fontSize: 12, fontWeight: '600', color: '#7C3AED', marginBottom: 8, letterSpacing: 0.5 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 28 },
  stepSub: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  bankChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB' },
  bankChipActive: { borderColor: '#7C3AED', backgroundColor: '#F3E8FF' },
  bankChipText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  bankChipTextActive: { color: '#7C3AED', fontWeight: '700' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 16 },
  nextBtnDisabled: { backgroundColor: '#D1D5DB' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  quizOptions: { gap: 12, marginTop: 8 },
  quizOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  quizOptionNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' },
  quizOptionNumText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  quizOptionText: { flex: 1, fontSize: 14, color: '#111827', lineHeight: 20 },
  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 16 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  riskBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 16, padding: 18, marginBottom: 14 },
  riskBadgeEmoji: { fontSize: 28 },
  riskBadgeType: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  riskBadgeDesc: { fontSize: 13, color: '#374151', lineHeight: 20 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  assetText: { fontSize: 12, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  allocBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  allocSeg: { height: 10 },
  allocLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  allocLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  allocDot: { width: 8, height: 8, borderRadius: 4 },
  allocLegendText: { fontSize: 12, color: '#374151' },
  bankTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 14 },
  bankTipText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 20 },
  productTabRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 14 },
  productTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  productTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  productTabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  productTabTextActive: { color: '#111827', fontWeight: '700' },
  productCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 },
  productHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  productTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  productTagText: { fontSize: 11, fontWeight: '600' },
  productDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  fallbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 10 },
  fallbackText: { fontSize: 11, color: '#D97706', flex: 1 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#7C3AED' },
  retryText: { fontSize: 15, fontWeight: '600', color: '#7C3AED' },
  econTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 14 },
  econTipText: { flex: 1, fontSize: 12, color: '#065F46', lineHeight: 18 },
  etfPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  etfPrice: { fontSize: 14, fontWeight: '700', color: '#111827' },
  etfChange: { fontSize: 13, fontWeight: '600' },
  etfAum: { fontSize: 11, color: '#9CA3AF' },
  simulateHeader: { marginBottom: 14 },
  simulateTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  simulateSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  simulateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  simulateYear: { width: 42, fontSize: 13, fontWeight: '600', color: '#374151' },
  simulateBar: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  simulateBarFill: { height: 10, borderRadius: 5 },
  simulateAmount: { width: 100, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  simulateDisclaimer: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },
  aiCard: { backgroundColor: '#F3E8FF', borderRadius: 16, padding: 16, marginBottom: 14 },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiCardTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  aiCardText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  aiCardEmpty: { fontSize: 13, color: '#9CA3AF' },
  historyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  historyDate: { fontSize: 12, color: '#6B7280' },
  historyBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  historyType: { fontSize: 12, fontWeight: '700' },
})
