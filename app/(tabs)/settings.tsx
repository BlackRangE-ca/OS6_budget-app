import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  async function handleLogout() {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>

      <View style={styles.card}>
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>앱 버전</Text>
          <Text style={styles.itemValue}>1.0.0</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>개인정보 처리방침</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>이용약관</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8', padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  itemText: { fontSize: 15, color: '#111827' },
  itemValue: { fontSize: 14, color: '#9CA3AF' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  logoutBtn: { marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
})
