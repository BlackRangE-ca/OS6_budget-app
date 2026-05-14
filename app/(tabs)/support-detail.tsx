import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native'
import { supportPrograms } from '../../lib/supportPrograms'

export default function SupportDetailScreen({ route, navigation }: any) {
  const { id } = route.params

  const program = supportPrograms.find(
    (item) => item.id === Number(id)
  )

  if (!program) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>지원금 정보를 찾을 수 없습니다.</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const openLink = () => {
    Linking.openURL(program.link)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.category}>{program.category}</Text>
      <Text style={styles.title}>{program.title}</Text>

      <View style={styles.box}>
        <Text style={styles.label}>지원 대상</Text>
        <Text style={styles.content}>{program.target}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>주요 내용</Text>
        <Text style={styles.content}>{program.summary}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>신청 조건</Text>
        <Text style={styles.content}>{program.condition}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>지원 혜택</Text>
        <Text style={styles.content}>{program.benefit}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={openLink}>
        <Text style={styles.buttonText}>신청 사이트 바로가기</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  category: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 24,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})