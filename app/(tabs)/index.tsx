import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function DashboardScreen() {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>대시보드</Text>
      <Text style={styles.sub}>이번 달 지출 현황</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 60, color: '#1a1a2e' },
  sub: { fontSize: 14, color: '#888', marginTop: 4 },
  logoutButton: { marginTop: 40, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  logoutText: { color: '#888', fontSize: 14 },
})
