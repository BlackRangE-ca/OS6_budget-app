import { View, Text, StyleSheet } from 'react-native'

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>대시보드</Text>
      <Text style={styles.sub}>이번 달 지출 현황</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 60, color: '#1a1a2e' },
  sub: { fontSize: 14, color: '#888', marginTop: 4 },
})
