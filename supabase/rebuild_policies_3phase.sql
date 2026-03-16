-- =============================================================================
-- 3 AŞAMALI YENİDEN KURULUM: KISITLAMALARI KALDIR → TİPİ DEĞİŞTİR → POLİTİKALARI KUR
-- Supabase SQL Editor'a yapıştırıp tek seferde çalıştırın.
-- =============================================================================

-- ==================== AŞAMA 1a: POLİTİKALARI DROP ET ====================
do $$
declare r record;
begin
  for r in (
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('user_tickets', 'deals', 'user_stats', 'lottery_tickets')
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    raise notice 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
  end loop;
end $$;

-- ==================== AŞAMA 1b: user_id'YE BAĞLI TÜM KISITLAMALARI DROP ET ====================
-- FK'ler (user_id references auth.users) ve PK'ler (user_id içeren) kaldırılır
do $$
declare
  r record;
  tbl text;
begin
  for tbl in select unnest(ARRAY['user_tickets', 'lottery_tickets', 'user_stats'])
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=tbl) then
      for r in (
        select c.conname, c.contype
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        join pg_attribute a on a.attnum = any(c.conkey) and a.attrelid = c.conrelid and not a.attisdropped
        where n.nspname = 'public' and t.relname = tbl and a.attname = 'user_id'
      ) loop
        execute format('alter table public.%I drop constraint if exists %I cascade', tbl, r.conname);
        raise notice 'Dropped constraint % on %', r.conname, tbl;
      end loop;
    end if;
  end loop;
end $$;

-- Başka tabloların bu tablolara referans veren FK'lerini de kaldır
do $$
declare r record;
begin
  for r in (
    select c.conname, t.relname as tbl
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f' and n.nspname = 'public'
      and c.confrelid in (
        select oid from pg_class where relname in ('user_tickets','lottery_tickets','user_stats') and relnamespace = (select oid from pg_namespace where nspname='public')
      )
  ) loop
    execute format('alter table public.%I drop constraint if exists %I cascade', r.tbl, r.conname);
    raise notice 'Dropped FK % from %', r.conname, r.tbl;
  end loop;
end $$;

-- ==================== AŞAMA 2: DEĞİŞTİR - user_id SÜTUNLARINI TEXT YAP ====================
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_tickets' and column_name='user_id' and data_type='uuid') then
    alter table public.user_tickets alter column user_id type text using user_id::text;
    raise notice 'user_tickets.user_id -> text';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='lottery_tickets' and column_name='user_id' and data_type='uuid') then
    alter table public.lottery_tickets alter column user_id type text using user_id::text;
    raise notice 'lottery_tickets.user_id -> text';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_stats' and column_name='user_id' and data_type='uuid') then
    alter table public.user_stats alter column user_id type text using user_id::text;
    raise notice 'user_stats.user_id -> text';
  end if;
end $$;

-- Primary key'leri yeniden oluştur (drop edildiyse)
do $$
begin
  if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid where t.relname='user_stats' and c.contype='p') then
    alter table public.user_stats add primary key (user_id);
    raise notice 'user_stats PK recreated';
  end if;
  if not exists (select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid where t.relname='user_tickets' and c.contype='p') then
    alter table public.user_tickets add primary key (user_id, draw_week);
    raise notice 'user_tickets PK recreated';
  end if;
end $$;

-- ==================== AŞAMA 3: YENİDEN KUR - POLİTİKALAR + FONKSİYON ====================

-- Tablolar yoksa oluştur (user_id text ile)
create table if not exists public.user_stats (
  user_id text primary key,
  cuan integer not null default 0,
  tiket integer not null default 0,
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_stats
  add column if not exists total_receipts integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists current_streak integer not null default 0,
  add column if not exists last_upload_date date;

create table if not exists public.user_tickets (
  user_id text not null,
  draw_week integer not null,
  tickets integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, draw_week)
);
create index if not exists user_tickets_draw_week_idx on public.user_tickets (draw_week);

create table if not exists public.lottery_tickets (
  id bigserial primary key,
  user_id text not null,
  draw_week integer not null,
  created_at timestamptz default now()
);
create index if not exists lottery_tickets_draw_week_idx on public.lottery_tickets (draw_week);

create table if not exists public.weekly_lottery (
  id bigserial primary key,
  draw_date date not null,
  winner_user_id text not null,
  tickets_used integer not null,
  reward_amount integer not null default 100000,
  created_at timestamptz not null default now()
);
create index if not exists weekly_lottery_draw_date_idx on public.weekly_lottery (draw_date);

create table if not exists public.weekly_winners (
  id bigserial primary key,
  user_id text,
  draw_date date,
  prize_amount integer default 100000,
  created_at timestamptz not null default now()
);
create index if not exists weekly_winners_created_at_idx on public.weekly_winners (created_at desc);

create table if not exists public.deals (
  id bigint generated by default as identity primary key,
  lat double precision not null,
  lng double precision not null,
  product_name text,
  price integer,
  store text,
  image text,
  status text default 'active',
  discount integer,
  expiry timestamptz,
  is_red_label boolean default false,
  created_at timestamptz default now()
);
create index if not exists deals_location_idx on public.deals (lat, lng);
create index if not exists deals_status_idx on public.deals (status);

-- upsert_user_ticket (text uyumlu)
create or replace function public.upsert_user_ticket(p_user_id text, p_draw_week integer, p_add integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_tickets (user_id, draw_week, tickets, updated_at)
  values (p_user_id, p_draw_week, least(p_add, 42), now())
  on conflict (user_id, draw_week)
  do update set tickets = least(public.user_tickets.tickets + p_add, 42), updated_at = now();
end;
$$;

-- grant_deal_tickets (uid::text kullanır)
create or replace function public.grant_deal_tickets()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  v_draw_week integer;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'User not authenticated';
  end if;
  v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
  perform public.upsert_user_ticket(uid::text, v_draw_week, 2);
  insert into public.lottery_tickets (user_id, draw_week)
  select uid::text, v_draw_week from generate_series(1, 2);
  return jsonb_build_object('success', true, 'tickets_added', 2);
end;
$$;

grant execute on function public.grant_deal_tickets() to authenticated;
grant execute on function public.grant_deal_tickets() to anon;

-- RLS politikaları (text uyumlu)
alter table public.user_stats enable row level security;
create policy "User stats select"
  on public.user_stats for select to anon, authenticated using (true);

alter table public.user_tickets enable row level security;
create policy "User tickets select"
  on public.user_tickets for select to authenticated
  using ((user_id::text) = (auth.uid()::text));

alter table public.deals enable row level security;
create policy "Deals insert"
  on public.deals for insert to anon, authenticated with check (true);
create policy "Deals select"
  on public.deals for select to anon, authenticated using (true);

alter table public.lottery_tickets enable row level security;
create policy "Lottery tickets select"
  on public.lottery_tickets for select to anon, authenticated using (true);

alter table public.weekly_lottery enable row level security;
create policy "Weekly lottery select"
  on public.weekly_lottery for select to anon, authenticated using (true);

alter table public.weekly_winners enable row level security;
create policy "Weekly winners select"
  on public.weekly_winners for select to anon, authenticated using (true);

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('promos', 'promos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('deals', 'deals', true)
on conflict (id) do update set public = excluded.public;

-- Storage politikaları
drop policy if exists "Receipts bucket insert" on storage.objects;
drop policy if exists "Receipts bucket insert all" on storage.objects;
drop policy if exists "Receipts bucket select" on storage.objects;
drop policy if exists "Promos bucket insert" on storage.objects;
drop policy if exists "Promos bucket insert all" on storage.objects;
drop policy if exists "Promos bucket select" on storage.objects;
drop policy if exists "Deals bucket insert" on storage.objects;
drop policy if exists "Deals bucket insert all" on storage.objects;
drop policy if exists "Deals bucket select" on storage.objects;
drop policy if exists "Users can upload to deals folder" on storage.objects;
drop policy if exists "Public read deals images" on storage.objects;
drop policy if exists "receipts_insert" on storage.objects;
drop policy if exists "receipts_select" on storage.objects;
drop policy if exists "receipts_update" on storage.objects;
drop policy if exists "promos_insert" on storage.objects;
drop policy if exists "promos_select" on storage.objects;
drop policy if exists "promos_update" on storage.objects;
drop policy if exists "deals_insert" on storage.objects;
drop policy if exists "deals_select" on storage.objects;
drop policy if exists "deals_update" on storage.objects;

create policy "receipts_insert"
  on storage.objects for insert to anon, authenticated with check (bucket_id = 'receipts');
create policy "receipts_select"
  on storage.objects for select to anon, authenticated using (bucket_id = 'receipts');
create policy "receipts_update"
  on storage.objects for update to anon, authenticated using (bucket_id = 'receipts');

create policy "promos_insert"
  on storage.objects for insert to anon, authenticated with check (bucket_id = 'promos');
create policy "promos_select"
  on storage.objects for select to anon, authenticated using (bucket_id = 'promos');
create policy "promos_update"
  on storage.objects for update to anon, authenticated using (bucket_id = 'promos');

create policy "deals_insert"
  on storage.objects for insert to anon, authenticated with check (bucket_id = 'deals');
create policy "deals_select"
  on storage.objects for select to anon, authenticated using (bucket_id = 'deals');
create policy "deals_update"
  on storage.objects for update to anon, authenticated using (bucket_id = 'deals');
