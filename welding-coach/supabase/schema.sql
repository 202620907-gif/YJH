-- ============================================================
-- 용접 코치 AI - Supabase 설정 스크립트
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에
-- 이 파일 전체를 붙여넣고 Run 을 누르세요.
-- ============================================================

-- 1) 분석 기록 테이블
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  image_url text,
  weld_process text,
  material text,
  total_score int,
  summary text,
  defects jsonb,
  appearance jsonb,
  next_practice text
);

alter table public.analyses enable row level security;

drop policy if exists "analyses_select_all" on public.analyses;
create policy "analyses_select_all"
  on public.analyses for select using (true);

drop policy if exists "analyses_insert_all" on public.analyses;
create policy "analyses_insert_all"
  on public.analyses for insert with check (true);

-- 2) 작품 사진 저장용 버킷 (public)
insert into storage.buckets (id, name, public)
values ('welding-photos', 'welding-photos', true)
on conflict (id) do nothing;

drop policy if exists "photos_select_all" on storage.objects;
create policy "photos_select_all"
  on storage.objects for select using (bucket_id = 'welding-photos');

drop policy if exists "photos_insert_all" on storage.objects;
create policy "photos_insert_all"
  on storage.objects for insert with check (bucket_id = 'welding-photos');
