import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

export default function InvestmentScreen() {
  const navigation = useNavigation() as any

  return (
    <View style={styles.container}>
      <Text style={styles.title}>투자</Text>

      <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('PeerComparison')}>
        <View style={styles.menuIcon}>
          <Ionicons name="people-outline" size={24} color="#2563EB" />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>또래 비교</Text>
          <Text style={styles.menuSub}>연령대별 평균 자산·구성·인기 ETF</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('InvestmentRecommendation')}>
        <View style={[styles.menuIcon, { backgroundColor: '#F3E8FF' }]}>
          <Ionicons name="bulb-outline" size={24} color="#7C3AED" />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>투자 성향 분석</Text>
          <Text style={styles.menuSub}>은행 선택 · 성향 테스트 → 맞춤 예금·ETF 추천</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Support')}>
        <View style={styles.menuIcon}>
          <Ionicons name="cash-outline" size={24} color="#2563EB" />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>지원금 정보</Text>
          <Text style={styles.menuSub}>청년 지원정책 · 금융상품 · 경제지표</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 20, paddingHorizontal: 24 },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, gap: 12 },
  menuIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  menuSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
})
