import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator, PermissionsAndroid,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { parseTransactionText } from '../../lib/parseTransactionText'
import { getSmsMessages, SmsMessage } from 'android-sms'
import { Category, TransactionType } from '../../types'

const CATEGORIES: Category[] = ['식비', '교통', '주거', '통신', '의료', '문화', '쇼핑', '저축', '기타', '수입']

function formatNumber(value: string) {
  const num = value.replace(/[^0-9]/g, '')
  return num ? Number(num).toLocaleString() : ''
}

function parseNumber(value: string) {
  return value.replace(/,/g, '')
}

type ParsedSms = Omit<SmsMessage, 'date'> & {
  amount: number
  merchant: string
  category: Category
  type: TransactionType
  date: string
}

export default function AddScreen() {
  const navigation = useNavigation()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('식비')
  const [type, setType] = useState<TransactionType>('variable')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [smsModalVisible, setSmsModalVisible] = useState(false)
  const [smsList, setSmsList] = useState<ParsedSms[]>([])
  const [smsLoading, setSmsLoading] = useState(false)

  async function handleLoadFromSms() {
    if (Platform.OS !== 'android') {
      Alert.alert('미지원', '문자 불러오기는 Android에서만 지원됩니다.')
      return
    }

    let granted = false
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS 읽기 권한',
          message: '은행 문자를 자동으로 읽어오려면 SMS 읽기 권한이 필요합니다.',
          buttonPositive: '허용',
          buttonNegative: '거부',
        }
      )
      granted = result === PermissionsAndroid.RESULTS.GRANTED
    } catch {
      granted = false
    }

    if (!granted) {
      Alert.alert('권한 거부', 'SMS 읽기 권한이 필요합니다. 설정에서 허용해주세요.')
      return
    }

    setSmsLoading(true)
    setSmsModalVisible(true)

    try {
      const messages = await getSmsMessages(100)
      const parsed: ParsedSms[] = []
      for (const msg of messages) {
        const result = parseTransactionText(msg.body)
        if (result && result.amount > 0) {
          parsed.push({
            ...msg,
            amount: result.amount,
            merchant: result.merchant,
            category: result.category,
            type: result.type,
            date: result.date,
          })
        }
      }
      setSmsList(parsed)
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '문자를 불러오지 못했습니다.')
      setSmsModalVisible(false)
    } finally {
      setSmsLoading(false)
    }
  }

  function handleSelectSms(item: ParsedSms) {
    setAmount(item.amount.toLocaleString())
    setMemo(item.merchant)
    setCategory(item.category)
    setType(item.type)
    setDate(item.date)
    setSmsModalVisible(false)
  }

  async function handleSubmit() {
    const rawAmount = parseNumber(amount)
    if (!rawAmount || isNaN(Number(rawAmount))) {
      Alert.alert('오류', '금액을 올바르게 입력해주세요.')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('transactions').insert({
      user_id: user!.id,
      amount: Number(rawAmount),
      category,
      type,
      memo,
      date,
    })

    if (error) {
      Alert.alert('오류', '저장에 실패했습니다.')
    } else {
      Alert.alert('완료', '지출이 저장됐습니다.')
      setAmount('')
      setMemo('')
      setCategory('식비')
      setType('variable')
    }
    setLoading(false)
  }

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>지출 추가</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>금액</Text>
          {Platform.OS === 'android' && (
            <TouchableOpacity style={styles.importButton} onPress={handleLoadFromSms}>
              <Ionicons name="chatbubble-outline" size={18} color="#2563EB" />
              <Text style={styles.importButtonText}>받은 문자에서 불러오기</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder="0"
            value={amount}
            onChangeText={(v) => setAmount(formatNumber(v))}
            keyboardType="numeric"
          />

          <Text style={styles.label}>유형</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'variable' && styles.typeActive]}
              onPress={() => setType('variable')}
            >
              <Text style={[styles.typeText, type === 'variable' && styles.typeTextActive]}>변동지출</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'fixed' && styles.typeActive]}
              onPress={() => setType('fixed')}
            >
              <Text style={[styles.typeText, type === 'fixed' && styles.typeTextActive]}>고정지출</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'income' && styles.typeIncomeActive]}
              onPress={() => { setType('income'); setCategory('수입') }}
            >
              <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>수입</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>카테고리</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryButton, category === cat && styles.categoryActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>날짜</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            maxLength={10}
          />

          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="메모를 입력하세요"
            value={memo}
            onChangeText={setMemo}
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? '저장 중...' : '저장하기'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SMS 선택 모달 */}
      <Modal
        visible={smsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSmsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>은행 문자 선택</Text>
              <TouchableOpacity onPress={() => setSmsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {smsLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>문자 불러오는 중...</Text>
              </View>
            ) : smsList.length === 0 ? (
              <View style={styles.loadingWrap}>
                <Ionicons name="mail-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>파싱 가능한 은행 문자가 없습니다</Text>
                <Text style={styles.emptySubText}>카드/계좌 결제 문자를 확인해주세요</Text>
              </View>
            ) : (
              <FlatList
                data={smsList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.smsItem} onPress={() => handleSelectSms(item)}>
                    <View style={styles.smsRow}>
                      <Text style={styles.smsAmount}>{item.amount.toLocaleString()}원</Text>
                      <Text style={styles.smsBadge}>{item.category}</Text>
                    </View>
                    <Text style={styles.smsMerchant} numberOfLines={1}>{item.merchant}</Text>
                    <Text style={styles.smsMeta}>{item.address} · {item.date}</Text>
                    <Text style={styles.smsBody} numberOfLines={2}>{item.body}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#F2F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  importButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 13, marginBottom: 10 },
  importButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  typeButton: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  typeActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeIncomeActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  typeText: { color: '#555', fontWeight: '500' },
  typeTextActive: { color: '#fff' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  categoryActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  categoryText: { color: '#555', fontSize: 13 },
  categoryTextActive: { color: '#fff' },
  button: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // SMS Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', minHeight: 300 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: 13, color: '#9CA3AF' },
  smsItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  smsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  smsAmount: { fontSize: 17, fontWeight: '700', color: '#111827' },
  smsBadge: { fontSize: 11, color: '#4f46e5', backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  smsMerchant: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
  smsMeta: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  smsBody: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
})
