import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

export default function GoalScreen({ navigation }: any) {
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [monthlySaving, setMonthlySaving] = useState(0)

  const target = Number(goalAmount.replace(/,/g, '')) || 0
  const current = Number(currentAmount.replace(/,/g, '')) || 0
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const remaining = Math.max(target - current, 0)

  const expectedMonths =
    remaining > 0 && monthlySaving > 0 ? Math.ceil(remaining / monthlySaving) : 0

  const GOAL_STORAGE_KEY = 'user_goal'

  const formatNumber = (value: string) => {
    const onlyNumber = value.replace(/[^0-9]/g, '')
    return onlyNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  useEffect(() => {
    const load = async () => {
      const savedGoal = await AsyncStorage.getItem(GOAL_STORAGE_KEY)
      if (savedGoal) {
        const parsed = JSON.parse(savedGoal)
        setGoalName(parsed.goalName)
        setGoalAmount(parsed.goalAmount)
        setCurrentAmount(parsed.currentAmount)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`

      const [{ data: budgetData }, { data: txData }] = await Promise.all([
        supabase.from('budgets').select('salary').eq('user_id', user.id).eq('month', thisMonth).maybeSingle(),
        supabase.from('transactions').select('amount, type')
          .eq('user_id', user.id)
          .gte('date', `${thisMonth}-01`)
          .lt('date', `${nextMonth}-01`),
      ])

      const salary = budgetData?.salary ?? 0
      const totalExpense = (txData ?? [])
        .filter((t: any) => t.type !== 'income')
        .reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0)

      setMonthlySaving(Math.max(salary - totalExpense, 0))
    }

    load()
  }, [])

  const handleSave = async () => {
  if (!goalName || !goalAmount || !currentAmount) {
    Alert.alert('입력 확인', '목표명, 목표 금액, 현재 금액을 모두 입력해주세요.')
    return
  }

  const goalData = {
    goalName,
    goalAmount,
    currentAmount,
  }

  await AsyncStorage.setItem(
    GOAL_STORAGE_KEY,
    JSON.stringify(goalData)
  )

  Alert.alert('저장 완료', '목표가 저장되었습니다.')
}
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>목표 설정</Text>
          <Text style={styles.subtitle}>재무 목표와 달성률을 관리해요</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>목표 이름</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 여행 자금, 비상금, 노트북 구매"
          value={goalName}
          onChangeText={setGoalName}
        />

        <Text style={styles.label}>목표 금액</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.moneyInput}
            placeholder="3,000,000"
            keyboardType="numeric"
            value={goalAmount}
            onChangeText={(text) => setGoalAmount(formatNumber(text))}
          />
          <Text style={styles.unit}>원</Text>
        </View>
       <View style={styles.row}>
  <Text style={styles.rowLabel}>남은 금액</Text>
  <Text style={styles.rowValue}>
    {remaining.toLocaleString()}원
  </Text>
</View>

<Text style={styles.advice}>
  {progress >= 100
    ? '목표를 달성했어요!'
    : monthlySaving <= 0
    ? '이번 달 저축 여력 정보가 없어요. 예산을 먼저 설정해주세요.'
    : `월 저축 여력 ${monthlySaving.toLocaleString()}원 기준, 약 ${expectedMonths}개월 후 목표 달성 예상`}
</Text>
        <Text style={styles.label}>현재 모은 금액</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.moneyInput}
            placeholder="500,000"
            keyboardType="numeric"
            value={currentAmount}
            onChangeText={(text) => setCurrentAmount(formatNumber(text))}
          />
          <Text style={styles.unit}>원</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>저장하기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>목표 달성률</Text>

        <Text style={styles.goalName}>
          {goalName || '목표를 입력해주세요'}
        </Text>

        <Text style={styles.percent}>{Math.round(progress)}%</Text>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>현재 금액</Text>
          <Text style={styles.rowValue}>{current.toLocaleString()}원</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>목표 금액</Text>
          <Text style={styles.rowValue}>{target.toLocaleString()}원</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>남은 금액</Text>
          <Text style={styles.rowValue}>{remaining.toLocaleString()}원</Text>
        </View>

        <Text style={styles.advice}>
          {target === 0
            ? '목표 금액을 입력하면 달성률이 계산돼요.'
            : progress >= 100
            ? '목표를 달성했어요! 다음 목표를 설정해보세요.'
            : `목표까지 ${remaining.toLocaleString()}원이 남았어요.`}
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  moneyInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  unit: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  percent: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 12,
  },
  progressBg: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
 advice: {
  marginTop: 16,
  fontSize: 14,
  color: '#2563EB',
  lineHeight: 22,
  fontWeight: '600',
},
  
})