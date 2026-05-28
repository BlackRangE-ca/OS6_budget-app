import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { ConsumptionTypeResult } from '../lib/analyzeConsumption'
import { analyzeConsumptionTypeAI } from '../lib/analyzeConsumptionAI'
import { sendMessage, makeWelcomeMessage, ChatMessage } from '../lib/chatApi'
import { isKbSeeded, seedKnowledgeBase, syncUserSpending, syncRealtimeData } from '../lib/vectorStore'

type SeedStatus = 'checking' | 'seeding' | 'ready' | 'error'

export default function ChatbotScreen() {
  const navigation = useNavigation()
  const flatListRef = useRef<FlatList>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [analysis, setAnalysis] = useState<ConsumptionTypeResult | null>(null)
  const [salary, setSalary] = useState<number | undefined>(undefined)
  const [userId, setUserId] = useState<string>('')
  const [riskType, setRiskType] = useState<string | undefined>(undefined)
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('checking')
  const [seedProgress, setSeedProgress] = useState({ done: 0, total: 0 })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // 사용자 소비 데이터 + KB 시딩을 병렬로 시작
    const [analysisResult] = await Promise.all([
      loadAnalysis(user.id),
      ensureReady(user.id),
      supabase.from('risk_profiles').select('risk_type').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single()
        .then(({ data }) => { if (data?.risk_type) setRiskType(data.risk_type) }),
    ])

    if (analysisResult) {
      setMessages([{ role: 'assistant', content: makeWelcomeMessage(analysisResult) }])
    }
  }

  async function loadAnalysis(uid: string): Promise<ConsumptionTypeResult | null> {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

    const [{ data: txData }, { data: budgetData }] = await Promise.all([
      supabase.from('transactions').select('amount, category, type, date')
        .eq('user_id', uid).gte('date', `${thisMonth}-01`).lt('date', `${nextMonth}-01`),
      supabase.from('budgets').select('salary, amount').eq('user_id', uid).eq('month', thisMonth).single(),
    ])

    const fixedData = (txData ?? []).filter((t: any) => t.type === 'fixed')

    const result = await analyzeConsumptionTypeAI(
      txData ?? [], budgetData?.salary ?? null, budgetData?.amount ?? null, fixedData,
    )
    setAnalysis(result)
    if (budgetData?.salary) setSalary(budgetData.salary)
    return result
  }

  const [seedError, setSeedError] = useState('')

  async function ensureReady(uid: string) {
    try {
      setSeedStatus('checking')
      const seeded = await isKbSeeded()
      if (!seeded) {
        setSeedStatus('seeding')
        await seedKnowledgeBase((done, total) => setSeedProgress({ done, total }))
      }
      setSeedStatus('ready')
      // 실시간 API 데이터는 백그라운드 동기화 (실패해도 챗봇 사용 가능)
      syncRealtimeData().catch(e => console.warn('[syncRealtimeData]', e))
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      console.error('[KB Seed Error]', msg)
      setSeedError(msg)
      setSeedStatus('error')
    }
  }

  // 분석 데이터가 준비되면 사용자 소비 데이터도 pgvector에 동기화
  useEffect(() => {
    if (!analysis || !userId || seedStatus !== 'ready') return
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    syncUserSpending(userId, month, analysis).catch(console.error)
  }, [analysis, userId, seedStatus])

  async function handleSend() {
    const text = input.trim()
    if (!text || isTyping || !analysis || seedStatus !== 'ready') return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)

    try {
      const reply = await sendMessage(newMessages, analysis, userId, salary, undefined, riskType)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `오류: ${e.message ?? '잠시 후 다시 시도해주세요.'}`,
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const SUGGESTIONS = ['식비를 줄이려면?', '내 소비 습관 분석해줘', '청년 지원 정책 알려줘', '저축 얼마나 해야 해?']

  const isReady = seedStatus === 'ready'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={[styles.aiDot, { backgroundColor: isReady ? '#7C3AED' : '#D1D5DB' }]} />
          <Text style={styles.title}>AI 재무 상담</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* 재무 현황 배너 */}
      {analysis && (
        <View style={styles.contextBanner}>
          <Ionicons name="analytics-outline" size={14} color="#7C3AED" />
          <Text style={styles.contextText}>
            {analysis.score.grade}등급 · {analysis.type} · {analysis.totalAmount.toLocaleString()}원
          </Text>
        </View>
      )}

      {/* KB 시딩 중 안내 */}
      {(seedStatus === 'checking' || seedStatus === 'seeding') && (
        <View style={styles.seedBanner}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.seedText}>
            {seedStatus === 'checking'
              ? '지식 베이스 확인 중...'
              : `정책·금융 데이터 준비 중 (${seedProgress.done}/${seedProgress.total})`}
          </Text>
        </View>
      )}

      {seedStatus === 'error' && (
        <View style={[styles.seedBanner, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="warning-outline" size={14} color="#EF4444" />
          <Text style={[styles.seedText, { color: '#EF4444', flex: 1 }]} numberOfLines={2}>
            {seedError || '지식 베이스 로딩 실패'}
          </Text>
        </View>
      )}

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            {item.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={12} color="#7C3AED" />
              </View>
            )}
            <View style={[
              styles.bubbleContent,
              item.role === 'user' ? styles.bubbleContentUser : styles.bubbleContentAssistant,
            ]}>
              <Text style={[
                styles.bubbleText,
                item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
              ]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <ActivityIndicator color="#7C3AED" />
            <Text style={styles.emptyText}>재무 데이터 분석 중...</Text>
          </View>
        }
        ListFooterComponent={
          isTyping ? (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={12} color="#7C3AED" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#7C3AED" />
              </View>
            </View>
          ) : null
        }
      />

      {/* 추천 질문 (첫 메시지 이후, 시딩 완료 시만) */}
      {messages.length === 1 && isReady && (
        <View style={styles.suggestRow}>
          {SUGGESTIONS.map(s => (
            <TouchableOpacity key={s} style={styles.suggestBtn} onPress={() => setInput(s)}>
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 입력창 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={isReady ? '재무 고민을 물어보세요...' : '지식 베이스 준비 중...'}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={300}
          editable={isReady}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isTyping || !isReady) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isTyping || !isReady}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3E8FF', paddingHorizontal: 16, paddingVertical: 8,
  },
  contextText: { fontSize: 12, color: '#7C3AED', fontWeight: '500' },
  seedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EDE9FE', paddingHorizontal: 16, paddingVertical: 10,
  },
  seedText: { fontSize: 12, color: '#7C3AED' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  messageList: { padding: 16, paddingBottom: 8 },
  bubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleAssistant: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubbleContent: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleContentUser: { backgroundColor: '#7C3AED', borderBottomRightRadius: 4 },
  bubbleContentAssistant: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#111827' },
  typingBubble: { backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  suggestBtn: { backgroundColor: '#EDE9FE', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  suggestText: { fontSize: 12, color: '#7C3AED', fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100, borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
})
