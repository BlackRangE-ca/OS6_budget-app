import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Category, TransactionType, Transaction } from '../types'

const CATEGORIES: Category[] = ['식비', '교통', '주거', '통신', '의료', '문화', '쇼핑', '저축', '기타']

function formatNumber(value: string) {
  const num = value.replace(/[^0-9]/g, '')
  return num ? Number(num).toLocaleString() : ''
}

function parseNumber(value: string) {
  return value.replace(/,/g, '')
}

export default function EditScreen() {
  const route = useRoute() as any
  const navigation = useNavigation()
  const tx: Transaction = route.params.transaction

  const [amount, setAmount] = useState(tx.amount.toLocaleString())
  const [category, setCategory] = useState<Category>(tx.category)
  const [type, setType] = useState<TransactionType>(tx.type)
  const [memo, setMemo] = useState(tx.memo ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const rawAmount = parseNumber(amount)
    if (!rawAmount || isNaN(Number(rawAmount))) {
      Alert.alert('오류', '금액을 올바르게 입력해주세요.')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('transactions')
      .update({ amount: Number(rawAmount), category, type, memo })
      .eq('id', tx.id)

    if (error) {
      Alert.alert('오류', '수정에 실패했습니다.')
    } else {
      Alert.alert('완료', '수정됐습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ])
    }
    setLoading(false)
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>지출 수정</Text>

      <Text style={styles.label}>금액</Text>
      <TextInput
        style={styles.input}
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

      <Text style={styles.label}>메모 (선택)</Text>
      <TextInput
        style={styles.input}
        placeholder="메모를 입력하세요"
        value={memo}
        onChangeText={setMemo}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '저장 중...' : '수정하기'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>취소</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 60, marginBottom: 24, color: '#1a1a2e' },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 10 },
  typeButton: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  typeActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  typeText: { color: '#555', fontWeight: '500' },
  typeTextActive: { color: '#fff' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  categoryActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  categoryText: { color: '#555', fontSize: 13 },
  categoryTextActive: { color: '#fff' },
  button: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { padding: 16, alignItems: 'center', marginTop: 12, marginBottom: 40 },
  cancelText: { color: '#aaa', fontSize: 15 },
})
