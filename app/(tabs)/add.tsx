import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { parseTransactionText } from '../../lib/parseTransactionText'
import { Category, TransactionType } from '../../types'

const CATEGORIES: Category[] = ['식비', '교통', '주거', '통신', '의료', '문화', '쇼핑', '저축', '기타', '수입']

function formatNumber(value: string) {
  const num = value.replace(/[^0-9]/g, '')
  return num ? Number(num).toLocaleString() : ''
}

function parseNumber(value: string) {
  return value.replace(/,/g, '')
}

export default function AddScreen() {
  const navigation = useNavigation()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('식비')
  const [type, setType] = useState<TransactionType>('variable')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  async function handleLoadFromSms() {
    const clipboardText = await Clipboard.getStringAsync()
    const parsed = parseTransactionText(clipboardText)

    if (!parsed) {
      Alert.alert('불러오기 실패', '클립보드에서 금액을 찾지 못했습니다. 은행 문자 원문을 복사한 뒤 다시 시도해주세요.')
      return
    }

    Alert.alert(
      '문자에서 불러오기',
      `${parsed.amount.toLocaleString()}원 / ${parsed.merchant} / ${parsed.category}로 추가할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: () => {
            setAmount(parsed.amount.toLocaleString())
            setMemo(parsed.merchant)
            setCategory(parsed.category)
            setType(parsed.type)
            setDate(parsed.date)
          },
        },
      ],
    )
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>지출 추가</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>금액</Text>
      <TouchableOpacity style={styles.importButton} onPress={handleLoadFromSms}>
        <Ionicons name="clipboard-outline" size={18} color="#2563EB" />
        <Text style={styles.importButtonText}>문자에서 불러오기</Text>
      </TouchableOpacity>
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
})
