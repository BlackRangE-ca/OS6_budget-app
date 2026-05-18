export type ApiSupportProgram = {
  id: string
  title: string
  category: string
  target: string
  summary: string
  condition: string
  benefit: string
  link: string
}

const SERVICE_KEY = process.env.EXPO_PUBLIC_PUBLIC_DATA_KEY

const API_URL =
  'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001'

function getXmlValue(xml: string, tagName: string) {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's')
  const match = xml.match(regex)

  return match
    ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    : ''
}

function getXmlItems(xml: string) {
  const itemRegex = /<servList>(.*?)<\/servList>/gs
  return [...xml.matchAll(itemRegex)].map((match) => match[1])
}

const YOUTH_KEY = process.env.EXPO_PUBLIC_YOUTH_KEY

const YOUTH_POLICY_FALLBACK: ApiSupportProgram[] = [
  {
    id: 'youth-1',
    title: '청년도약계좌',
    category: '자산형성',
    target: '만 19~34세, 개인소득 7,500만원 이하',
    summary: '월 최대 70만원 납입 시 정부 기여금 최대 2.4만원 지원. 5년 만기 시 최대 5,000만원 목돈 마련 가능.',
    condition: '만 19~34세 / 개인소득 7,500만원 이하 / 가구소득 중위 250% 이하',
    benefit: '정부 기여금 월 최대 24,000원 + 비과세 혜택',
    link: 'https://ylaccount.kinfa.or.kr',
  },
  {
    id: 'youth-2',
    title: '청년 전세자금대출 (중소기업 취업청년)',
    category: '주거지원',
    target: '만 34세 이하 중소·중견기업 재직자',
    summary: '전세보증금 최대 1억원까지 연 1.2% 저금리 대출. 보증금 부담 없이 독립 가능.',
    condition: '만 34세 이하 / 중소·중견기업 재직 1년 이상 / 연소득 5,500만원 이하',
    benefit: '대출한도 최대 1억원 / 금리 연 1.2% / 최대 8년',
    link: 'https://nhuf.molit.go.kr',
  },
  {
    id: 'youth-3',
    title: '청년 월세 한시 특별지원',
    category: '주거지원',
    target: '만 19~34세 독립 거주 청년',
    summary: '월 최대 20만원씩 최대 12개월간 월세 지원. 주거비 부담을 직접적으로 줄여줘요.',
    condition: '만 19~34세 / 부모와 별도 거주 / 임차보증금 5,000만원 이하·월세 60만원 이하',
    benefit: '월 최대 200,000원 × 최대 12개월 = 최대 240만원',
    link: 'https://www.myhome.go.kr',
  },
  {
    id: 'youth-4',
    title: '중소기업 취업 청년 소득세 감면',
    category: '세금혜택',
    target: '만 34세 이하 중소기업 취업자',
    summary: '중소기업에 취업하면 5년간 소득세를 90% 감면해줘요. 사회초년생 세금 부담을 확 줄여줍니다.',
    condition: '만 34세 이하 / 중소기업 취업 / 2012년 이후 취업자',
    benefit: '소득세 90% 감면 / 최대 5년 / 연간 최대 200만원 한도',
    link: 'https://www.nts.go.kr',
  },
  {
    id: 'youth-5',
    title: '국민취업지원제도',
    category: '취업지원',
    target: '만 15~69세 구직자 (청년 우선)',
    summary: '취업 지원 서비스와 함께 구직촉진수당 월 50만원을 최대 6개월간 지급해요.',
    condition: '가구소득 중위 60% 이하 / 재산 4억원 이하 / 취업 경험 100일 이상',
    benefit: '구직촉진수당 월 500,000원 × 최대 6개월',
    link: 'https://www.kua.go.kr',
  },
  {
    id: 'youth-6',
    title: '청년내일채움공제',
    category: '자산형성',
    target: '만 34세 이하 중소·중견기업 신규 취업자',
    summary: '2년간 본인 400만원 + 기업 400만원 + 정부 400만원 = 1,200만원 목돈 마련.',
    condition: '만 34세 이하 / 중소·중견기업 정규직 신규 취업 / 고용보험 가입 이력 12개월 이하',
    benefit: '2년 만기 시 1,200만원 (본인납입 400만원 + 기업·정부지원 800만원)',
    link: 'https://www.work.go.kr',
  },
  {
    id: 'youth-7',
    title: '청년 마음건강 지원사업',
    category: '생활지원',
    target: '만 19~34세 청년',
    summary: '심리상담 바우처를 지원해 정신건강 서비스를 저렴하게 이용할 수 있어요.',
    condition: '만 19~34세 / 소득 기준 없음',
    benefit: '심리상담 10회 / 회당 최대 50,000원 지원',
    link: 'https://www.mohw.go.kr',
  },
]

export async function fetchYouthPolicies(): Promise<{ data: ApiSupportProgram[]; isFallback: boolean }> {
  if (!YOUTH_KEY) return { data: YOUTH_POLICY_FALLBACK, isFallback: true }

  try {
    const url =
      `https://www.youthcenter.go.kr/go/opi/selectPolicyList.do` +
      `?openApiVlak=${YOUTH_KEY}` +
      `&display=10` +
      `&pageIndex=1` +
      `&srchPolicyId=` +
      `&srchFieldCd=030006` // 일자리·금융·주거

    const response = await fetch(url)
    const data = await response.json()
    const list = data?.youthPolicy ?? []

    if (list.length === 0) return { data: YOUTH_POLICY_FALLBACK, isFallback: true }

    return {
      data: list.map((item: any) => ({
        id: item.polyBizSjnm ?? String(Math.random()),
        title: item.polyBizSjnm ?? '청년 정책',
        category: item.polyRlmCd ?? '청년지원',
        target: item.ageInfo ?? '청년',
        summary: item.polyItcnCn ?? '',
        condition: item.acptMthd ?? '',
        benefit: item.sporCn ?? '',
        link: item.rfcSiteAddrMobile ?? 'https://www.youthcenter.go.kr',
      })),
      isFallback: false,
    }
  } catch {
    return { data: YOUTH_POLICY_FALLBACK, isFallback: true }
  }
}

export async function fetchSupportPrograms(): Promise<ApiSupportProgram[]> {
  if (!SERVICE_KEY) {
    throw new Error('공공데이터포털 서비스키가 없습니다.')
  }

  const url =
    `${API_URL}` +
    `?serviceKey=${SERVICE_KEY}` +
    `&callTp=L` +
    `&pageNo=1` +
    `&numOfRows=30` +
    `&srchKeyCode=003` +
    `&searchWrd=${encodeURIComponent('청년')}`

  const response = await fetch(url)
  const xmlText = await response.text()

  console.log('지원금 API 전체 응답:', xmlText)

  if (xmlText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
    throw new Error('서비스키가 해당 API에 등록되지 않았습니다.')
  }

  if (xmlText.includes('SERVICE_ACCESS_DENIED_ERROR')) {
    throw new Error('해당 API 활용신청 승인이 필요합니다.')
  }

  if (xmlText.includes('Unexpected errors')) {
    throw new Error('API 요청 파라미터 또는 엔드포인트 오류입니다.')
  }

  const items = getXmlItems(xmlText)

  return items.map((item, index) => {
    const id = getXmlValue(item, 'servId') || String(index + 1)
    const title = getXmlValue(item, 'servNm') || '청년 지원 정책'
    const summary = getXmlValue(item, 'servDgst') || '상세 내용 확인 필요'
    const target =
      getXmlValue(item, 'trgterIndvdlArray') ||
      getXmlValue(item, 'lifeArray') ||
      '지원 대상 확인 필요'

    return {
      id,
      title,
      category: '청년 지원',
      target,
      summary,
      condition: '상세조회에서 확인 필요',
      benefit: summary,
      link: 'https://www.bokjiro.go.kr',
    }
  })
}