import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'


export default function InvestmentScreen({ navigation }: any) {
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>투자</Text>
      <View style={styles.empty}>
        <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>투자 기능 준비 중이에요</Text>
        <Text style={styles.emptySubText}>곧 예적금 추천과 투자 뉴스가{'\n'}제공될 예정이에요</Text>
      </View>
        <TouchableOpacity
    style={styles.menuCard}
    onPress={() => navigation.navigate('Support')}
  >
    <Text style={styles.menuIcon}>💰</Text>
    <Text style={styles.menuTitle}>지원금 정보</Text>
    <Text style={styles.menuSubtitle}>청년 지원 제도를 확인해보세요</Text>
  </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptySubText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
 menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
})
