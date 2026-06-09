import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { analyzeConsumptionType, ConsumptionTypeResult } from '../lib/analyzeConsumption'
import { sendMessage, makeWelcomeMessage, ChatMessage, AssetContext } from '../lib/chatApi'
import { isKbSeeded, seedKnowledgeBase, syncUserSpending } from '../lib/vectorStore'

export default function ChatbotFAB() {
  const [visible, setVisible] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [analysis, setAnalysis] = useState<ConsumptionTypeResult | null>(null)
  const [salary, setSalary] = useState<number | undefined>()
  const [assets, setAssets] = useState<AssetContext | undefined>()
  const [userId, setUserId] = useState('')
  const [ready, setReady] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // 처음 눌렀을 때 한 번만 초기화
  useEffect(() => {
    if (visible && !initialized) {
      setInitialized(true)
      init()
    }
  }, [visible])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

    const [{ data: txData }, { data: budgetData }, { data: assetData }] = await Promise.all([
      supabase.from('transactions').select('amount, category, type, date')
        .eq('user_id', user.id).gte('date', `${thisMonth}-01`).lt('date', `${nextMonth}-01`),
      supabase.from('budgets').select('salary, amount').eq('user_id', user.id).eq('month', thisMonth).maybeSingle(),
      supabase.from('user_assets').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fixedData = (txData ?? []).filter((t: any) => t.type === 'fixed')
    const result = analyzeConsumptionType(
      txData ?? [], budgetData?.salary ?? null, budgetData?.amount ?? null, fixedData,
    )
    setAnalysis(result)
    if (budgetData?.salary) setSalary(budgetData.salary)
    if (assetData) {
      setAssets({
        deposit: assetData.deposit ?? 0,
        savings: assetData.savings ?? 0,
        stock: assetData.stock ?? 0,
        insurance: assetData.insurance ?? 0,
        other: assetData.other ?? 0,
      })
    }

    setMessages([{ role: 'assistant', content: makeWelcomeMessage(result) }])

    // KB 시딩 확인
    try {
      const seeded = await isKbSeeded()
      if (!seeded) await seedKnowledgeBase()
      setReady(true)
      const month = thisMonth
      syncUserSpending(user.id, month, result).catch(() => {})
    } catch {
      setReady(true) // KB 실패해도 기본 대화는 가능
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isTyping || !analysis || !ready) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)

    try {
      const reply = await sendMessage(newMessages, analysis, userId, salary, assets)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `오류가 발생했어요. 잠시 후 다시 시도해주세요.`,
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* FAB 버튼 */}
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>

      {/* 챗봇 모달 */}
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.handleBar} />
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={[styles.dot, { backgroundColor: ready ? '#7C3AED' : '#D1D5DB' }]} />
                <Text style={styles.headerTitle}>AI 재무 상담</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {analysis && (
              <Text style={styles.contextLine}>
                {analysis.score.grade}등급 · {analysis.type} · {analysis.totalAmount.toLocaleString()}원
              </Text>
            )}
          </View>

          {/* 메시지 목록 */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.emptyText}>재무 데이터 불러오는 중...</Text>
              </View>
            }
            ListFooterComponent={
              isTyping ? (
                <View style={[styles.bubble, styles.bubbleAI]}>
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles" size={11} color="#7C3AED" />
                  </View>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                {item.role === 'assistant' && (
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles" size={11} color="#7C3AED" />
                  </View>
                )}
                <View style={[styles.bubbleContent, item.role === 'user' ? styles.contentUser : styles.contentAI]}>
                  <Text style={[styles.bubbleText, item.role === 'user' ? styles.textUser : styles.textAI]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
          />

          {/* 입력창 */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={ready ? '재무 고민을 물어보세요...' : '준비 중...'}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={300}
              editable={ready}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || isTyping || !ready) && styles.sendBtnOff]}
              onPress={handleSend}
              disabled={!input.trim() || isTyping || !ready}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 82,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    height: '72%',
    backgroundColor: '#F2F4F8',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  contextLine: { fontSize: 11, color: '#7C3AED', marginBottom: 2 },
  messageList: { padding: 14, paddingBottom: 8 },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  bubble: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', gap: 6 },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleAI: { justifyContent: 'flex-start' },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubbleContent: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  contentUser: { backgroundColor: '#7C3AED', borderBottomRightRadius: 4 },
  contentAI: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  bubbleText: { fontSize: 13, lineHeight: 20 },
  textUser: { color: '#fff' },
  textAI: { color: '#111827' },
  typingBubble: { backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: '#111827', maxHeight: 90, borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#D1D5DB' },
})
