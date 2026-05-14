export type SupportProgram = {
  id: number
  title: string
  category: string
  target: string
  summary: string
  condition: string
  benefit: string
  link: string
}

export const supportPrograms: SupportProgram[] = [
  {
    id: 1,
    title: '청년미래적금',
    category: '자산형성',
    target: '만 19세~34세 청년',
    summary: '청년의 목돈 마련을 지원하기 위해 출시 예정인 정책형 적금 상품입니다.',
    condition: '총급여 7,500만원 이하 또는 소상공인 연매출 3억원 이하, 가구 중위소득 200% 이하 등 조건 충족 필요',
    benefit: '정부기여금 및 이자소득 비과세 혜택 제공 예정',
    link: 'https://www.fsc.go.kr',
  },
  {
    id: 2,
    title: '청년월세지원',
    category: '주거',
    target: '무주택 청년',
    summary: '청년의 주거비 부담을 줄이기 위한 월세 지원 제도입니다.',
    condition: '소득 및 재산 기준 충족 필요',
    benefit: '월 최대 20만원 지원',
    link: 'https://www.bokjiro.go.kr',
  },
  {
    id: 3,
    title: '국민취업지원제도',
    category: '취업',
    target: '취업 준비 청년 및 구직자',
    summary: '취업지원과 생계지원을 함께 제공하는 제도입니다.',
    condition: '소득 및 취업 상태 기준 충족 필요',
    benefit: '구직촉진수당 최대 300만원',
    link: 'https://www.kua.go.kr',
  },
  {
    id: 4,
    title: '청년내일채움공제',
    category: '자산형성',
    target: '중소기업 취업 청년',
    summary: '근속 시 목돈을 마련할 수 있는 제도입니다.',
    condition: '중소기업 재직 및 일정 기간 근속 필요',
    benefit: '최대 1,200만원 적립',
    link: 'https://www.work.go.kr',
  },
  {
    id: 5,
    title: '청년전세자금대출',
    category: '주거',
    target: '무주택 청년',
    summary: '저금리로 전세 자금을 지원하는 대출 상품입니다.',
    condition: '소득 및 자산 기준 충족 필요',
    benefit: '저금리 전세자금 대출',
    link: 'https://nhuf.molit.go.kr',
  },
]