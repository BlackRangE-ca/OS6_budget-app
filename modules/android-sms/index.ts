import { Platform } from 'react-native'
import { requireNativeModule } from 'expo-modules-core'

export type SmsMessage = {
  id: string
  address: string
  body: string
  date: number
}

export async function getSmsMessages(maxCount = 50): Promise<SmsMessage[]> {
  if (Platform.OS !== 'android') return []
  const AndroidSms = requireNativeModule('AndroidSms')
  return AndroidSms.getSmsMessages(maxCount)
}
