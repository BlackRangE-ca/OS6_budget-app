import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'

import { fetchSupportPrograms } from '../../lib/supportApi'
import {
  fetchDepositProducts,
  fetchSavingProducts,
} from '../../lib/financeApi'
import { fetchKeyStatistics } from '../../lib/economyApi'

type CategoryType = 'policy' | 'finance' | 'economy'


export default function SupportScreen({ navigation }: any) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('policy')
  const [policyPrograms, setPolicyPrograms] = useState<any[]>([])
  const [financePrograms, setFinancePrograms] = useState<any[]>([])
  const [savingPrograms, setSavingPrograms] = useState<any[]>([])
  const [economyPrograms, setEconomyPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        setLoading(true)

        const apiPrograms = await fetchSupportPrograms()

        if (apiPrograms.length > 0) {
          setPolicyPrograms(apiPrograms)
        }
         const depositProducts = await fetchDepositProducts()

      if (depositProducts.length > 0) {
        setFinancePrograms(depositProducts)
      }
       const savingProducts = await fetchSavingProducts()

      if (savingProducts.length > 0) {
        setSavingPrograms(savingProducts)
      }
      const keyStatistics = await fetchKeyStatistics()

if (keyStatistics.length > 0) {
  setEconomyPrograms(keyStatistics)
}
      } catch (error) {
        console.log('지원금 API 불러오기 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPrograms()
  }, [])

  const getProgramsByCategory = () => {
    if (selectedCategory === 'policy') return policyPrograms
    if (selectedCategory === 'finance') {
  return [...financePrograms, ...savingPrograms]
}
    return economyPrograms
  }

  const programs = getProgramsByCategory()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>지원금 정보</Text>
      <Text style={styles.subtitle}>
        청년 지원정책, 금융상품, 경제지표를 한눈에 확인해보세요.
      </Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedCategory === 'policy' && styles.activeTab,
          ]}
          onPress={() => setSelectedCategory('policy')}
        >
          <Text
            style={[
              styles.tabText,
              selectedCategory === 'policy' && styles.activeTabText,
            ]}
          >
            지원정책
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedCategory === 'finance' && styles.activeTab,
          ]}
          onPress={() => setSelectedCategory('finance')}
        >
          <Text
            style={[
              styles.tabText,
              selectedCategory === 'finance' && styles.activeTabText,
            ]}
          >
            금융상품
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedCategory === 'economy' && styles.activeTab,
          ]}
          onPress={() => setSelectedCategory('economy')}
        >
          <Text
            style={[
              styles.tabText,
              selectedCategory === 'economy' && styles.activeTabText,
            ]}
          >
            경제지표
          </Text>
        </TouchableOpacity>
      </View>

      {loading && selectedCategory === 'policy' && (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginBottom: 20 }}
        />
      )}

      <FlatList
        data={programs}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('SupportDetail', { program: item })
            }
          >
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>

            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSummary}>{item.summary}</Text>
            <Text style={styles.target}>대상: {item.target}</Text>
          </TouchableOpacity>
        )}
      />
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
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },

  activeTab: {
    backgroundColor: '#2563EB',
  },

  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },

  activeTabText: {
    color: '#fff',
  },

  list: {
    paddingBottom: 24,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },

  categoryText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },

  cardSummary: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },

  target: {
    fontSize: 13,
    color: '#777',
  },
})