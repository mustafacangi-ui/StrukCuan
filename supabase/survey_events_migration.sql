-- =============================================================================
-- Survey Events & Revenue Tracking
-- Anket tamamlandığında: kullanıcıya gidecek Cuan + platform brüt karı kaydedilir.
-- CPX Research / Pollfish webhook callback için kullanılacak.
-- =============================================================================

-- 1) survey_events tablosu
create table if not exists public.survey_events (
  id bigserial primary key,
  user_id text not null,
  provider text not null check (provider in ('cpx', 'pollfish', 'other')),
  survey_id text,
  transaction_id text,
  user_cuan integer not null default 0,
  gross_profit integer not null default 0,
  country_code char(2) default 'ID',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists survey_events_user_id_idx on public.survey_events (user_id);
create index if not exists survey_events_provider_idx on public.survey_events (provider);
create index if not exists survey_events_created_at_idx on public.survey_events (created_at desc);
create unique index if not exists survey_events_transaction_unique on public.survey_events (provider, transaction_id) where transaction_id is not null;

comment on table public.survey_events is 'Anket tamamlamaları: kullanıcı Cuan ödülü + platform brüt karı';
comment on column public.survey_events.user_cuan is 'Kullanıcıya verilecek Cuan miktarı';
comment on column public.survey_events.gross_profit is 'Platformun brüt karı (birim: Cuan veya para birimi)';

-- 2) Anket tamamlandığında: survey_events kaydı + user_stats.cuan güncelleme
create or replace function public.survey_completion_callback(
  p_user_id text,
  p_provider text,
  p_user_cuan integer,
  p_gross_profit integer,
  p_transaction_id text default null,
  p_survey_id text default null,
  p_country_code char(2) default 'ID',
  p_metadata jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint;
begin
  -- Duplicate transaction kontrolü
  if p_transaction_id is not null then
    if exists (
      select 1 from public.survey_events
      where provider = p_provider and transaction_id = p_transaction_id
    ) then
      return jsonb_build_object('success', false, 'error', 'duplicate_transaction');
    end if;
  end if;

  -- survey_events kaydı
  insert into public.survey_events (
    user_id, provider, survey_id, transaction_id,
    user_cuan, gross_profit, country_code, metadata
  )
  values (
    p_user_id, p_provider, p_survey_id, p_transaction_id,
    p_user_cuan, p_gross_profit, p_country_code, p_metadata
  )
  returning id into v_event_id;

  -- user_stats.cuan güncelle
  insert into public.user_stats (user_id, cuan, tiket, total_receipts, level)
  values (p_user_id, p_user_cuan, 0, 0, 1)
  on conflict (user_id)
  do update set
    cuan = public.user_stats.cuan + p_user_cuan,
    updated_at = now();

  -- Bildirim
  insert into public.notifications (user_id, title, message)
  values (
    p_user_id,
    'Anket Tamamlandı!',
    format('+%s Cuan kazandınız. Teşekkürler!', p_user_cuan)
  );

  return jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'user_cuan_added', p_user_cuan
  );
end;
$$;

grant execute on function public.survey_completion_callback(text, text, integer, integer, text, text, char(2), jsonb)
  to authenticated;
grant execute on function public.survey_completion_callback(text, text, integer, integer, text, text, char(2), jsonb)
  to service_role;

-- 3) RLS
alter table public.survey_events enable row level security;

-- Kullanıcı sadece kendi kayıtlarını görebilir
create policy "Users can read own survey_events"
  on public.survey_events for select
  to authenticated
  using (auth.uid()::text = user_id);

-- Insert/Update sadece service_role veya RPC üzerinden (callback)
-- Webhook için service_role kullanılacak
create policy "Service role full access survey_events"
  on public.survey_events for all
  to service_role
  using (true)
  with check (true);
