# OS6 가계부 앱 (Budget App)

사회 초년생을 위한 소비 관리 모바일 앱입니다.  
월 예산 설정, 고정/변동 지출 분류, 소비 패턴 분석 기능을 제공합니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 모바일 | React Native + Expo |
| 언어 | TypeScript |
| 백엔드/DB | Supabase (PostgreSQL) |
| 상태관리 | Zustand |
| 협업 | GitHub + JIRA |

---

## 사전 설치

아래 항목을 순서대로 설치하세요.

### 1. Node.js
- [nodejs.org](https://nodejs.org) 접속
- **LTS 버전** 다운로드 및 설치
- 설치 확인:
  ```bash
  node -v   # v18 이상
  npm -v
  ```

### 2. Expo Go (스마트폰)
- 앱스토어 또는 플레이스토어에서 **Expo Go** 검색 후 설치

### 3. VS Code (권장 에디터)
- [code.visualstudio.com](https://code.visualstudio.com) 에서 설치

---

## 초기 세팅

### 1. 레포지토리 클론
```bash
git clone https://github.com/BlackRangE-ca/OS6_budget-app.git
cd OS6_budget-app
git checkout dev
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경변수 설정
프로젝트 루트에 `.env` 파일 생성 후 아래 내용 입력:
```
EXPO_PUBLIC_SUPABASE_URL=팀장에게 문의
EXPO_PUBLIC_SUPABASE_ANON_KEY=팀장에게 문의
```
> ⚠️ `.env` 파일은 보안상 GitHub에 올리지 않습니다. 팀장에게 직접 받으세요.

---

## 실행 방법

```bash
npx expo start
```

터미널에 QR코드가 뜨면 **Expo Go 앱**으로 스캔하면 됩니다.

---

## 브랜치 규칙

```
main        → 최종 배포용 (직접 push 금지)
dev         → 통합 브랜치 (PR을 통해서만 merge)
feature/*   → 기능 개발 브랜치
```

### 작업 순서
```
1. dev 브랜치에서 feature 브랜치 생성
   git checkout dev
   git checkout -b feature/KAN-번호-기능명

2. 기능 개발 후 커밋
   git add .
   git commit -m "KAN-번호: 작업 내용"

3. GitHub에 push
   git push origin feature/KAN-번호-기능명

4. GitHub에서 PR 생성
   base: dev ← compare: feature/...

5. 팀원 리뷰 후 merge
```

### 커밋 메시지 규칙
```
KAN-7: 지출 CRUD Supabase 연동
KAN-8: 월 예산 설정 화면 구현
```
> JIRA 티켓 번호를 앞에 붙이면 자동으로 티켓과 연결됩니다.

---

## JIRA 칸반 보드 사용법

| 컬럼 | 언제 이동하나요? |
|------|----------------|
| 아이디어 | 기획 중인 기능 |
| 해야 할 일 | 이번 주 작업 예정 |
| 진행 중 | 지금 개발 중 |
| 검토 중 | PR 올린 상태 |
| 완료 | merge 완료 |

---

## 프로젝트 구조

```
OS6_budget-app/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx       # 로그인 화면
│   │   └── signup.tsx      # 회원가입 화면
│   └── (tabs)/
│       ├── index.tsx       # 대시보드
│       ├── add.tsx         # 지출 추가
│       └── analysis.tsx    # 소비 분석
├── lib/
│   └── supabase.ts         # Supabase 클라이언트
├── types/
│   └── index.ts            # TypeScript 타입 정의
└── .env                    # 환경변수 (Git 제외)
```

---

## 팀 구성

| 역할 | 담당 |
|------|------|
| 개발 | 팀장 |
| JIRA 관리 / 테스트 | 팀원 A |
| 콘텐츠 조사 / 발표 | 팀원 B |

---

## 문의

작업 중 막히는 부분은 JIRA 티켓에 코멘트로 남겨주세요.
