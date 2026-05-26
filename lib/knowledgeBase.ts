// 임베딩해서 pgvector에 저장할 정적 지식 베이스
// source: 금감원 금융상품 / 공공데이터 복지정책 / LH 주거정책

export type KbDoc = {
  content: string
  source: 'policy' | 'housing' | 'finance'
  metadata: Record<string, string>
}

export const KB_DOCUMENTS: KbDoc[] = [
  // ── 복지정책 (공공데이터 기반) ────────────────────────────
  {
    content: '청년도약계좌: 만 19~34세, 개인소득 7,500만원 이하. 월 최대 70만원 납입 시 정부 기여금 최대 24,000원 지원. 5년 만기 최대 5,000만원 목돈 마련. 비과세 혜택.',
    source: 'policy',
    metadata: { title: '청년도약계좌', category: '자산형성' },
  },
  {
    content: '청년 전세자금대출 (중소기업 취업청년): 만 34세 이하, 중소·중견기업 재직 1년 이상, 연소득 5,500만원 이하. 연 1.2% 저금리로 최대 1억원 전세보증금 대출.',
    source: 'policy',
    metadata: { title: '청년 전세자금대출', category: '주거지원' },
  },
  {
    content: '청년 월세 한시 특별지원: 만 19~34세 독립 거주 청년, 부모와 별거, 임차보증금 5,000만원 이하, 월세 60만원 이하. 월 최대 200,000원씩 최대 12개월 지원.',
    source: 'policy',
    metadata: { title: '청년 월세 한시 특별지원', category: '주거지원' },
  },
  {
    content: '중소기업 취업 청년 소득세 감면: 만 34세 이하, 2012년 이후 중소기업 취업자. 취업 후 5년간 소득세 90% 감면. 연간 최대 200만원 한도.',
    source: 'policy',
    metadata: { title: '중소기업 취업 청년 소득세 감면', category: '세금혜택' },
  },
  {
    content: '국민취업지원제도: 만 15~69세 구직자 (청년 우선). 가구소득 중위 60% 이하, 재산 4억원 이하. 취업 지원 서비스 + 구직촉진수당 월 500,000원 최대 6개월.',
    source: 'policy',
    metadata: { title: '국민취업지원제도', category: '취업지원' },
  },
  {
    content: '청년내일채움공제: 만 34세 이하, 중소·중견기업 정규직 신규 취업자, 고용보험 이력 12개월 이하. 2년간 본인 400만원+기업 400만원+정부 400만원 = 총 1,200만원 지급.',
    source: 'policy',
    metadata: { title: '청년내일채움공제', category: '자산형성' },
  },
  {
    content: '청년 마음건강 지원사업: 만 19~34세 청년, 소득 기준 없음. 심리상담 바우처 10회 지원, 회당 최대 50,000원. 정신건강 서비스 저렴하게 이용 가능.',
    source: 'policy',
    metadata: { title: '청년 마음건강 지원사업', category: '생활지원' },
  },

  // ── LH 주거정책 ───────────────────────────────────────────
  {
    content: 'LH 청년 전세임대주택: 만 19~39세 무주택 청년. LH가 희망 주택을 전세계약 후 저렴하게 재임대. 수시모집.',
    source: 'housing',
    metadata: { title: 'LH 청년 전세임대주택', category: '전세임대' },
  },
  {
    content: 'LH 청년 매입임대주택: 만 19~39세 무주택 청년·대학생. LH가 기존 주택 매입 후 시세 40~50% 수준 임대. 보증금 100만원부터 가능.',
    source: 'housing',
    metadata: { title: 'LH 청년 매입임대주택', category: '매입임대' },
  },
  {
    content: '행복주택: 청년·신혼부부·대학생. 직장·학교 근처 시세 60~80% 수준 공공임대. 공고별 모집.',
    source: 'housing',
    metadata: { title: '행복주택', category: '공공임대' },
  },
  {
    content: '버팀목 전세자금대출: 만 34세 이하 무주택 단독세대주. 연 1.8~2.7% 금리, 최대 7,000만원. 수도권 보증금 3억원 이하.',
    source: 'housing',
    metadata: { title: '버팀목 전세자금대출', category: '전세대출' },
  },
  {
    content: '청년 주택드림 대출: 만 39세 이하 무주택 청년. 생애 최초 주택 구입 시 연 2.2~3.0% 저금리로 최대 3억원 대출.',
    source: 'housing',
    metadata: { title: '청년 주택드림 대출', category: '주택구입대출' },
  },

  // ── 금감원 금융상품 · 재무 기초 ──────────────────────────
  {
    content: '사회초년생 재무 원칙: 수입의 20% 이상 저축 목표. 비상금(3~6개월 생활비) 먼저 확보. CMA·파킹통장에 보관해 이자 챙기기. 고정비(주거+통신+보험) 수입의 50% 이하 유지.',
    source: 'finance',
    metadata: { title: '사회초년생 재무 원칙', category: '재무기본' },
  },
  {
    content: '식비 절감 방법: 주간 식비 예산 설정 후 지키기. 배달앱 대신 마트 장보기. 점심 도시락 챙기기. 외식 횟수 주 2회 이하 제한. 편의점 도시락·삼각김밥 활용.',
    source: 'finance',
    metadata: { title: '식비 절감', category: '지출관리' },
  },
  {
    content: 'ETF 소액 투자 입문: 월 1만원부터 적립식 가능. KODEX 200(국내 시장 전체), TIGER 미국S&P500(미국 대형주 500개) 입문용 추천. 분산 투자로 리스크 낮추기.',
    source: 'finance',
    metadata: { title: 'ETF 소액 투자 입문', category: '투자입문' },
  },
]
