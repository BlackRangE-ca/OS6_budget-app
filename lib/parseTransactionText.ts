import { Category, TransactionType } from '../types'

export type ParsedTransactionText = {
  amount: number
  merchant: string
  category: Category
  type: TransactionType
  date: string
  source: string
  confidence: number
  rawText: string
}

const CATEGORY_KEYWORDS: { category: Category; keywords: string[] }[] = [
  { category: '식비', keywords: ['스타벅스', '카페', '커피', '투썸', '이디야', '메가커피', '컴포즈', '편의점', 'cu', 'gs25', '세븐일레븐', '식당', '배민', '요기요', '쿠팡이츠'] },
  { category: '교통', keywords: ['택시', '지하철', '주유', '버스', '카카오t', '티머니', '코레일', 'srt', '충전소', '하이패스'] },
  { category: '쇼핑', keywords: ['쿠팡', '이마트', '네이버페이', '무신사', '지마켓', '옥션', '11번가', '올리브영', '마켓컬리', '컬리'] },
  { category: '의료', keywords: ['병원', '약국', '의원', '치과', '한의원', '의료'] },
  { category: '주거', keywords: ['관리비', '월세', '전기', '가스', '수도', '도시가스'] },
  { category: '통신', keywords: ['통신', '휴대폰', 'sk텔레콤', 'kt', 'lg유플러스', '유플러스', '알뜰폰'] },
  { category: '문화', keywords: ['넷플릭스', '유튜브', '멜론', '왓챠', '티빙', '웨이브', '영화', '공연', '교보', '알라딘'] },
]

const INCOME_KEYWORDS = ['입금', '받았', '받음', '급여', '월급', '환급', '캐시백', '정산', '이자']
const AMOUNT_CONTEXT_KEYWORDS = ['결제', '승인', '사용', '출금', '이체', '송금', '입금', '구매', '납부']
const MERCHANT_STOP_WORDS = ['잔액', '누적', '한도', '승인번호', '카드번호', '일시', '문의']

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function parseDate(text: string, now = new Date()) {
  const full = text.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/)
  if (full) return `${full[1]}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`

  const slash = text.match(/(\d{1,2})[./](\d{1,2})/)
  if (slash) return `${now.getFullYear()}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`

  const korean = text.match(/(\d{1,2})월\s*(\d{1,2})일/)
  if (korean) return `${now.getFullYear()}-${korean[1].padStart(2, '0')}-${korean[2].padStart(2, '0')}`

  return formatDate(now)
}

function detectSource(text: string) {
  const lower = text.toLowerCase()
  if (text.includes('국민')) return '국민은행'
  if (text.includes('신한')) return '신한'
  if (text.includes('카카오뱅크')) return '카카오뱅크'
  if (text.includes('하나')) return '하나은행'
  if (text.includes('토스') || lower.includes('toss')) return '토스'
  if (text.includes('은행')) return '은행'
  if (text.includes('카드')) return '카드'
  return '알 수 없음'
}

function parseType(text: string): TransactionType {
  return INCOME_KEYWORDS.some(keyword => text.includes(keyword)) ? 'income' : 'variable'
}

function parseAmount(text: string) {
  const contextual = text.match(new RegExp(`(?:${AMOUNT_CONTEXT_KEYWORDS.join('|')})([^\\d]{0,30})(\\d{1,3}(?:,\\d{3})+|\\d+)\\s*원`))
  if (contextual?.[2] && !/(잔액|한도|누적|총|보유)/.test(contextual[1])) {
    return Number(contextual[2].replace(/,/g, ''))
  }

  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/g)]
  const usable = matches.find(match => {
    const before = text.slice(Math.max(0, match.index! - 12), match.index)
    return !/(잔액|한도|누적|총|보유)/.test(before)
  })
  return usable?.[1] ? Number(usable[1].replace(/,/g, '')) : null
}

function cleanMerchant(value: string) {
  return value
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/(?:BC카드|체크카드|신용카드|카드|결제|승인|사용|출금|이체|송금|입금|구매|납부)/g, ' ')
    .replace(/(?:\d{1,3}(?:,\d{3})+|\d+)\s*원/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SENTENCE_ENDINGS = /(?:어요|습니다|했어요|됐어요|되었어요|입니다|했습니다|됩니다)$/

function filterTokens(s: string) {
  return s.split(/\s+/).filter(p => p.length >= 2).join(' ')
}

function extractMerchant(text: string) {
  const amountMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/)
  if (!amountMatch || amountMatch.index == null) return ''

  const beforeAmount = text.slice(0, amountMatch.index)
  let afterAmount = text.slice(amountMatch.index + amountMatch[0].length)

  const stopIndex = MERCHANT_STOP_WORDS
    .map(word => afterAmount.indexOf(word))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0]
  if (stopIndex != null) afterAmount = afterAmount.slice(0, stopIndex)

  // 카카오페이/토스 형식: "[설명] 상점에서 N원을 결제했어요" — 금액 앞 "에서" 바로 전이 상점명
  const eseMatch = beforeAmount.match(/(.+)에서\s*$/)
  if (eseMatch) {
    const parts = eseMatch[1].trim().split(/\s+/)
      .map(p => p.replace(/[.!?。,]+$/, ''))
      .filter(p => !SENTENCE_ENDINGS.test(p))
    const cleaned = filterTokens(cleanMerchant(parts.slice(-3).join(' ')))
    if (cleaned) return cleaned.slice(0, 40)
  }

  const fromAfterAmount = cleanMerchant(afterAmount)
  if (fromAfterAmount) return fromAfterAmount.slice(0, 40)

  return filterTokens(cleanMerchant(beforeAmount)).slice(0, 40)
}

function inferCategory(text: string, merchant: string, type: TransactionType): Category {
  if (type === 'income') return '수입'

  const target = `${text} ${merchant}`.toLowerCase()
  const match = CATEGORY_KEYWORDS.find(group =>
    group.keywords.some(keyword => target.includes(keyword.toLowerCase())),
  )
  return match?.category ?? '기타'
}

export function parseTransactionText(rawText: string, now = new Date()): ParsedTransactionText | null {
  const text = normalizeText(rawText)
  if (!text) return null

  const amount = parseAmount(text)
  if (!amount || amount <= 0) return null

  const type = parseType(text)
  const merchant = extractMerchant(text)
  const category = inferCategory(text, merchant, type)
  const source = detectSource(text)

  let confidence = 0.55
  if (source !== '알 수 없음') confidence += 0.1
  if (AMOUNT_CONTEXT_KEYWORDS.concat(INCOME_KEYWORDS).some(keyword => text.includes(keyword))) confidence += 0.2
  if (merchant) confidence += 0.1
  if (category !== '기타' && category !== '수입') confidence += 0.1

  return {
    amount,
    merchant: merchant || source,
    category,
    type,
    date: parseDate(text, now),
    source,
    confidence: Math.max(0.1, Math.min(0.95, confidence)),
    rawText,
  }
}
