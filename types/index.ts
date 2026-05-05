export type TransactionType = 'fixed' | 'variable'

export type Category = 
  | '식비' | '교통' | '주거' | '통신' | '의료'
  | '문화' | '쇼핑' | '저축' | '기타'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  category: Category
  type: TransactionType
  memo?: string
  date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  month: string
  amount: number
  salary?: number
  created_at: string
}