export type DepositProduct = {
  id: string
  title: string
  category: string
  target: string
  summary: string
  condition: string
  benefit: string
  link: string
}

const FINLIFE_KEY = process.env.EXPO_PUBLIC_FINLIFE_KEY

const API_URL =
  'https://finlife.fss.or.kr/finlifeapi/depositProductsSearch.json'

export async function fetchDepositProducts(): Promise<DepositProduct[]> {
  if (!FINLIFE_KEY) {
    throw new Error('금감원 금융상품 API 인증키가 없습니다.')
  }

  const url =
    `${API_URL}` +
    `?auth=${FINLIFE_KEY}` +
    `&topFinGrpNo=020000` +
    `&pageNo=1`

  const response = await fetch(url)
  const data = await response.json()

  console.log('정기예금 API 응답:', data)

  const baseList = data?.result?.baseList ?? []
  const optionList = data?.result?.optionList ?? []

  return baseList.slice(0, 20).map((product: any, index: number) => {
    const options = optionList.filter(
      (option: any) => option.fin_prdt_cd === product.fin_prdt_cd
    )

    const bestOption = options.sort(
      (a: any, b: any) =>
        Number(b.intr_rate2 ?? 0) - Number(a.intr_rate2 ?? 0)
    )[0]

    const bankName = product.kor_co_nm ?? '금융회사'
    const productName = product.fin_prdt_nm ?? '정기예금 상품'
    const rate = bestOption?.intr_rate ?? '-'
    const maxRate = bestOption?.intr_rate2 ?? '-'
    const saveTerm = bestOption?.save_trm ?? '-'

    return {
      id: product.fin_prdt_cd ?? `deposit-${index}`,
      title: productName,
      category: '정기예금',
      target: bankName,
      summary: `${bankName}의 정기예금 상품입니다. 최고 우대금리 ${maxRate}%를 제공합니다.`,
      condition: product.join_member ?? '가입대상 확인 필요',
      benefit: `저축기간 ${saveTerm}개월 / 기본금리 ${rate}% / 최고금리 ${maxRate}%`,
      link: 'https://finlife.fss.or.kr',
    }
  })
}
export async function fetchAnnuityProducts(): Promise<DepositProduct[]> {
  if (!FINLIFE_KEY) throw new Error('금감원 금융상품 API 인증키가 없습니다.')

  const url =
    `https://finlife.fss.or.kr/finlifeapi/annuitySavingProductsSearch.json` +
    `?auth=${FINLIFE_KEY}` +
    `&topFinGrpNo=060000` +
    `&pageNo=1`

  try {
    const response = await fetch(url)
    const data = await response.json()
    const baseList = data?.result?.baseList ?? []
    const optionList = data?.result?.optionList ?? []

    return baseList.slice(0, 20).map((product: any, index: number) => {
      const options = optionList.filter(
        (o: any) => o.fin_prdt_cd === product.fin_prdt_cd
      )
      const bestOption = options.sort(
        (a: any, b: any) => Number(b.intr_rate2 ?? 0) - Number(a.intr_rate2 ?? 0)
      )[0]

      const companyName = product.kor_co_nm ?? '금융회사'
      const productName = product.fin_prdt_nm ?? '연금저축 상품'
      const rate = bestOption?.intr_rate ?? '-'
      const maxRate = bestOption?.intr_rate2 ?? '-'

      return {
        id: `annuity-${product.fin_prdt_cd ?? index}`,
        title: productName,
        category: '연금저축',
        target: companyName,
        summary: `${companyName}의 연금저축 상품입니다. 최고 금리 ${maxRate}%`,
        condition: product.join_member ?? '가입대상 확인 필요',
        benefit: `기본금리 ${rate}% / 최고금리 ${maxRate}%`,
        link: 'https://finlife.fss.or.kr',
      }
    })
  } catch {
    return []
  }
}

export async function fetchSavingProducts(): Promise<DepositProduct[]> {
  if (!FINLIFE_KEY) {
    throw new Error('금감원 금융상품 API 인증키가 없습니다.')
  }

  const url =
    `https://finlife.fss.or.kr/finlifeapi/savingProductsSearch.json` +
    `?auth=${FINLIFE_KEY}` +
    `&topFinGrpNo=020000` +
    `&pageNo=1`

  const response = await fetch(url)
  const data = await response.json()

  console.log('적금 API 응답:', data)

  const baseList = data?.result?.baseList ?? []
  const optionList = data?.result?.optionList ?? []

  return baseList.slice(0, 20).map((product: any, index: number) => {
    const options = optionList.filter(
      (option: any) => option.fin_prdt_cd === product.fin_prdt_cd
    )

    const bestOption = options.sort(
      (a: any, b: any) =>
        Number(b.intr_rate2 ?? 0) - Number(a.intr_rate2 ?? 0)
    )[0]

    const bankName = product.kor_co_nm ?? '금융회사'
    const productName = product.fin_prdt_nm ?? '적금 상품'
    const rate = bestOption?.intr_rate ?? '-'
    const maxRate = bestOption?.intr_rate2 ?? '-'
    const saveTerm = bestOption?.save_trm ?? '-'

    return {
      id: `saving-${product.fin_prdt_cd ?? index}`,
      title: productName,
      category: '적금',
      target: bankName,
      summary: `${bankName}의 적금 상품입니다. 최고 우대금리 ${maxRate}%를 제공합니다.`,
      condition: product.join_member ?? '가입대상 확인 필요',
      benefit: `저축기간 ${saveTerm}개월 / 기본금리 ${rate}% / 최고금리 ${maxRate}%`,
      link: 'https://finlife.fss.or.kr',
    }
  })
}