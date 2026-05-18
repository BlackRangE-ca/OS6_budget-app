import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert, Share } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

const SEARCH_URLS: Record<string, string> = {
  'https://ylaccount.kinfa.or.kr': 'https://ylaccount.kinfa.or.kr/main',
  'https://nhuf.molit.go.kr': 'https://nhuf.molit.go.kr',
  'https://apply.lh.or.kr': 'https://apply.lh.or.kr',
  'https://www.kua.go.kr': 'https://www.kua.go.kr',
  'https://www.work.go.kr': 'https://www.work.go.kr/youth',
  'https://www.bokjiro.go.kr': 'https://www.bokjiro.go.kr/ssis-teu/twataa/wlfareInfo/moveTWAT52011M.do',
  'https://www.nts.go.kr': 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2227&cntntsId=7667',
  'https://www.mohw.go.kr': 'https://www.mohw.go.kr',
  'https://finlife.fss.or.kr': 'https://finlife.fss.or.kr',
}

export default function SupportDetailScreen() {
  const navigation = useNavigation() as any
  const route = useRoute() as any
  const { program } = route.params

  const deepLink = program.link ? (SEARCH_URLS[program.link] ?? program.link) : null

  async function handleCopyTitle() {
    await Share.share({ message: program.title })
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>{program.title}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{program.category}</Text>
        </View>
        <Text style={styles.sectionLabel}>대상</Text>
        <Text style={styles.sectionValue}>{program.target}</Text>
        <Text style={styles.sectionLabel}>요약</Text>
        <Text style={styles.sectionValue}>{program.summary}</Text>
        {!!program.condition && (
          <>
            <Text style={styles.sectionLabel}>신청 조건</Text>
            <Text style={styles.sectionValue}>{program.condition}</Text>
          </>
        )}
        {!!program.benefit && (
          <>
            <Text style={styles.sectionLabel}>혜택</Text>
            <Text style={styles.sectionValue}>{program.benefit}</Text>
          </>
        )}
      </View>

      {/* 검색 힌트 */}
      <View style={styles.searchHint}>
        <Ionicons name="search-outline" size={16} color="#2563EB" />
        <View style={{ flex: 1 }}>
          <Text style={styles.searchHintTitle}>사이트에서 이 이름으로 검색하세요</Text>
          <Text style={styles.searchHintName}>{program.title}</Text>
        </View>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTitle}>
          <Ionicons name="copy-outline" size={16} color="#2563EB" />
          <Text style={styles.copyText}>복사</Text>
        </TouchableOpacity>
      </View>

      {deepLink && (
        <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(deepLink)}>
          <Ionicons name="open-outline" size={16} color="#fff" />
          <Text style={styles.linkText}>신청 페이지로 이동</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 24, paddingTop: 60 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 30 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 20 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#E8F0FE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16 },
  badgeText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  sectionLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 4, marginTop: 12 },
  sectionValue: { fontSize: 14, color: '#374151', lineHeight: 22 },
  searchHint: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14 },
  searchHintTitle: { fontSize: 11, color: '#6B7280', marginBottom: 3 },
  searchHintName: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  copyText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563EB', marginHorizontal: 16, borderRadius: 14, paddingVertical: 14 },
  linkText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
