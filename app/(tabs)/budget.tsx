import { useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'

function formatNumber(value: string) {
  const num = value.replace(/[^0-9]/g, '')
  return num ? Number(num).toLocaleString() : ''
}

function parseNumber(value: string) {
  return value.replace(/,/g, '')
}

export default function BudgetScreen() {
  const [salary, setSalary] = useState('')
  const [budget, setBudget] = useState('')
  const [savedBudget, setSavedBudget] = useState<number | null>(null)
  const [savedSalary, setSavedSalary] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const _now = new Date()
  const thisMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`

  useFocusEffect(
    useCallback(() => {
      fetchBudget()
    }, [])
  )

  async function fetchBudget() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user!.id)
      .eq('month', thisMonth)
      .single()

    if (data) {
      setSavedBudget(data.amount)
      setSavedSalary(data.salary)
      setBudget(data.amount.toLocaleString())
      setSalary(data.salary ? data.salary.toLocaleString() : '')
    }
  }

  async function handleSave() {
    const rawBudget = parseNumber(budget)
    const rawSalary = parseNumber(salary)
    if (!rawBudget || isNaN(Number(rawBudget))) {
      Alert.alert('오류', '예산을 올바르게 입력해주세요.')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('budgets').upsert({
      user_id: user!.id,
      month: thisMonth,
      amount: Number(rawBudget),
      salary: rawSalary ? Number(rawSalary) : null,
    }, { onConflict: 'user_id,month' })

    if (error) {
      Alert.alert('오류', '저장에 실패했습니다.')
    } else {
      setSavedBudget(Number(rawBudget))
      setSavedSalary(rawSalary ? Number(rawSalary) : null)
      Alert.alert('완료', '예산이 저장됐습니다.')
    }
    setLoading(false)
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>예산 설정</Text>
      <Text style={styles.month}>{thisMonth}</Text>

      {savedBudget && (
        <View style={styles.savedCard}>
          <Text style={styles.savedLabel}>현재 설정된 예산</Text>
          <Text style={styles.savedAmount}>{savedBudget.toLocaleString()}원</Text>
          {savedSalary && (
            <Text style={styles.savedSalary}>월급 {savedSalary.toLocaleString()}원</Text>
          )}
        </View>
      )}

      <Text style={styles.label}>월급 (선택)</Text>
      <TextInput
        style={styles.input}
        placeholder="월급을 입력하세요"
        value={salary}
        onChangeText={(v) => setSalary(formatNumber(v))}
        keyboardType="numeric"
      />

      <Text style={styles.label}>이번 달 예산</Text>
      <TextInput
        style={styles.input}
        placeholder="예산을 입력하세요"
        value={budget}
        onChangeText={(v) => setBudget(formatNumber(v))}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '저장 중...' : '저장하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 60, color: '#1a1a2e' },
  month: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 24 },
  savedCard: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 20, marginBottom: 24 },
  savedLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  savedAmount: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  savedSalary: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  button: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
