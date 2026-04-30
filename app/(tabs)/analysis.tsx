import { View, Text, StyleSheet } from 'react-native'

export default function AnalysisScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>분석</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8f8ff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 60, color: '#1a1a2e' },
})
