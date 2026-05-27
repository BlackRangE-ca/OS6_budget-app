import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { fetchNews } from '../../lib/newsApi'

const keywords = ['ETF', '예금 금리', '적금 추천', '청년 재테크']

export default function NewsScreen() {
  const [selectedKeyword, setSelectedKeyword] = useState('ETF')
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true)
      const result = await fetchNews(selectedKeyword)
      setNews(result)
      setLoading(false)
    }

    loadNews()
  }, [selectedKeyword])

  const removeHtmlTags = (text: string) => {
    return text.replace(/<[^>]*>/g, '')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>관심사 뉴스</Text>
      <Text style={styles.subtitle}>
        관심 있는 금융 키워드의 최신 뉴스를 확인해보세요.
      </Text>

      <View style={styles.keywordContainer}>
        {keywords.map((keyword) => (
          <TouchableOpacity
            key={keyword}
            style={[
              styles.keywordButton,
              selectedKeyword === keyword && styles.activeKeyword,
            ]}
            onPress={() => setSelectedKeyword(keyword)}
          >
            <Text
              style={[
                styles.keywordText,
                selectedKeyword === keyword && styles.activeKeywordText,
              ]}
            >
              {keyword}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item, index) => item.link || index.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => Linking.openURL(item.link)}
            >
              <Text style={styles.cardTitle}>
                {removeHtmlTags(item.title)}
              </Text>
              <Text style={styles.cardDesc}>
                {removeHtmlTags(item.description)}
              </Text>
              <Text style={styles.date}>{item.pubDate}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 18,
  },
  keywordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  keywordButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  activeKeyword: {
    backgroundColor: '#2563EB',
  },
  keywordText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  activeKeywordText: {
    color: '#fff',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
})