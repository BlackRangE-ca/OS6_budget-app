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

      <TouchableOpacity
  style={styles.supportCard}
  onPress={() => navigation.navigate('News')}
>
  <Text style={styles.supportIcon}>📰</Text>
  <Text style={styles.supportTitle}>관심사 뉴스</Text>
  <Text style={styles.supportSubText}>
    ETF · 예금 · 적금 · 청년 재테크 뉴스 확인
  </Text>
</TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
<<<<<<< Updated upstream
  container: { flex: 1, backgroundColor: '#F2F4F8', paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 20, paddingHorizontal: 24 },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, gap: 12 },
  menuIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  menuSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
=======
  container: { flex: 1, backgroundColor: '#F2F4F8', padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptySubText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },

  supportCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  supportIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  supportSubText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
>>>>>>> Stashed changes
})
