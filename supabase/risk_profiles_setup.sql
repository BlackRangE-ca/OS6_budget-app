-- risk_profiles: 사용자 투자 성향 저장
create table if not exists risk_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  risk_type text not null,           -- 보수형 | 안정형 | 중립형 | 성장형 | 공격형
  quiz_score integer not null,       -- 퀴즈 총점 (0~6)
  selected_bank text,                -- 선택한 주거래 은행
  created_at timestamptz default now()
);

-- 사용자별 최신 성향 빠르게 조회
create index if not exists risk_profiles_user_created
  on risk_profiles(user_id, created_at desc);

-- RLS
alter table risk_profiles enable row level security;

create policy "본인 성향만 조회"
  on risk_profiles for select
  using (auth.uid() = user_id);

create policy "본인 성향 삽입"
  on risk_profiles for insert
  with check (auth.uid() = user_id);
