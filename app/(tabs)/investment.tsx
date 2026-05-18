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

      <View style={styles.empty}>
        <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>더 많은 투자 기능 준비 중이에요</Text>
        <Text style={styles.emptySubText}>곧 예적금 추천과 투자 뉴스가{'\n'}제공될 예정이에요</Text>
      </View>
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
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 80 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  emptySubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
})
