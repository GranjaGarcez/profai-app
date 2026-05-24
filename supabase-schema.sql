-- ============================================
-- PROF.IA — Schema completo da base de dados
-- Colar no SQL Editor do Supabase e executar
-- ============================================

create extension if not exists "uuid-ossp";

-- PROFILES (extensão do Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text default 'teacher' check (role in ('teacher', 'school_admin', 'student')),
  country_code text default 'PT',
  subjects text[] default '{}',
  year_levels int[] default '{}',
  org_name text,
  plan text default 'free' check (plan in ('free', 'pro', 'school', 'district')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: criar profile automaticamente no registo
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- TURMAS
create table if not exists public.classes (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  subject text,
  year_level int check (year_level between 1 and 12),
  academic_year text default '2025/2026',
  lms_source text default 'manual' check (lms_source in ('manual', 'google', 'moodle', 'teams')),
  lms_external_id text,
  student_count int default 0,
  created_at timestamptz default now()
);

-- ALUNOS POR TURMA
create table if not exists public.class_members (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  name text not null,
  email text,
  student_number text,
  joined_at timestamptz default now()
);

-- CONTEUDOS (testes, planos, rubricas, etc.)
create table if not exists public.content_items (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('test', 'lesson_plan', 'rubric', 'differentiated', 'brainstorm', 'feedback')),
  title text not null,
  subject text,
  year_level int,
  country_code text default 'PT',
  topic text,
  content jsonb not null default '{}',
  is_public boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EXAMES (instancias lancadas de um content_item)
create table if not exists public.exams (
  id uuid default uuid_generate_v4() primary key,
  content_item_id uuid references public.content_items(id) on delete cascade not null,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete set null,
  access_code text unique not null,
  status text default 'draft' check (status in ('draft', 'active', 'paused', 'closed')),
  time_limit_minutes int,
  shuffle_questions boolean default false,
  shuffle_options boolean default false,
  anti_cheat_level text default 'basic' check (anti_cheat_level in ('basic', 'strict')),
  allow_review boolean default false,
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- SESSOES DE ALUNOS
create table if not exists public.exam_sessions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references public.exams(id) on delete cascade not null,
  student_name text not null,
  student_email text,
  class_member_id uuid references public.class_members(id) on delete set null,
  status text default 'waiting' check (status in ('waiting', 'active', 'submitted', 'flagged')),
  started_at timestamptz,
  submitted_at timestamptz,
  score numeric(5,2),
  max_score numeric(5,2),
  percentage numeric(5,2),
  ip_address text,
  created_at timestamptz default now()
);

-- RESPOSTAS DOS ALUNOS
create table if not exists public.exam_answers (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.exam_sessions(id) on delete cascade not null,
  question_index int not null,
  question_text text,
  answer_value jsonb,
  is_correct boolean,
  points_awarded numeric(5,2) default 0,
  max_points numeric(5,2) default 1,
  ai_feedback text,
  graded_at timestamptz
);

-- REGISTO DE VIOLACOES (anti-batota)
create table if not exists public.violations_log (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.exam_sessions(id) on delete cascade not null,
  type text not null check (type in ('tab_switch', 'window_blur', 'copy_attempt', 'paste_attempt', 'right_click', 'fullscreen_exit')),
  occurred_at timestamptz default now(),
  duration_seconds int
);

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.content_items enable row level security;
alter table public.exams enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_answers enable row level security;
alter table public.violations_log enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id);
create policy "classes_own" on public.classes for all using (auth.uid() = teacher_id);
create policy "class_members_own" on public.class_members for all using (
  exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
);
create policy "content_own" on public.content_items for all using (auth.uid() = teacher_id);
create policy "content_public_read" on public.content_items for select using (is_public = true);
create policy "exams_own" on public.exams for all using (auth.uid() = teacher_id);
create policy "sessions_teacher" on public.exam_sessions for all using (
  exists (select 1 from public.exams where id = exam_id and teacher_id = auth.uid())
);
create policy "sessions_insert_public" on public.exam_sessions for insert with check (true);
create policy "answers_access" on public.exam_answers for all using (
  exists (
    select 1 from public.exam_sessions s
    join public.exams e on e.id = s.exam_id
    where s.id = session_id and e.teacher_id = auth.uid()
  )
);
create policy "answers_insert" on public.exam_answers for insert with check (true);
create policy "violations_access" on public.violations_log for all using (
  exists (
    select 1 from public.exam_sessions s
    join public.exams e on e.id = s.exam_id
    where s.id = session_id and e.teacher_id = auth.uid()
  )
);
create policy "violations_insert" on public.violations_log for insert with check (true);

-- INDICES
create index if not exists idx_content_teacher on public.content_items(teacher_id);
create index if not exists idx_classes_teacher on public.classes(teacher_id);
create index if not exists idx_exams_code on public.exams(access_code);
create index if not exists idx_exams_teacher on public.exams(teacher_id);
create index if not exists idx_sessions_exam on public.exam_sessions(exam_id);
create index if not exists idx_answers_session on public.exam_answers(session_id);
create index if not exists idx_violations_session on public.violations_log(session_id);

select 'Schema PROF.IA criado com sucesso!' as resultado;
