import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Session } from '@supabase/supabase-js'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from './lib/supabase'

import LoginScreen from './app/(auth)/login'
import SignupScreen from './app/(auth)/signup'
import DashboardScreen from './app/(tabs)/index'
import AddScreen from './app/(tabs)/add'
import AnalysisScreen from './app/(tabs)/analysis'
import SettingsScreen from './app/(tabs)/settings'
import InvestmentScreen from './app/(tabs)/investment'
import EditScreen from './app/edit'
import SalaryScreen from './app/salary'
import FixedDetailScreen from './app/fixed-detail'
import AllTransactionsScreen from './app/all-transactions'
import PeerComparisonScreen from './app/peer-comparison'
import SupportScreen from './app/(tabs)/support'
import SupportDetailScreen from './app/support-detail'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            홈: focused ? 'home' : 'home-outline',
            자산: focused ? 'wallet' : 'wallet-outline',
            투자: focused ? 'trending-up' : 'trending-up-outline',
            설정: focused ? 'menu' : 'menu-outline',
          }
          return <Ionicons name={icons[route.name] as any} size={22} color={color} />
        },
      })}
    >
      <Tab.Screen name="홈" component={DashboardScreen} />
      <Tab.Screen name="자산" component={AnalysisScreen} />
      <Tab.Screen name="투자" component={InvestmentScreen} />
      <Tab.Screen name="설정" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Edit" component={EditScreen} />
      <Stack.Screen name="Add" component={AddScreen} />
      <Stack.Screen name="Salary" component={SalaryScreen} />
      <Stack.Screen name="FixedDetail" component={FixedDetailScreen} />
      <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} />
      <Stack.Screen name="PeerComparison" component={PeerComparisonScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="SupportDetail" component={SupportDetailScreen} />
    </Stack.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) return null

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
