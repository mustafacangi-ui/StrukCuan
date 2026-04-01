-- =============================================================================
-- CPX Research postback — sadece bilet (ticket) ödülü; cuan/wallet yok.
-- Çalıştırma: Supabase SQL Editor veya migration olarak uygulayın.
-- =============================================================================

-- 1) user_stats: bilet kolonları (tiket ile uyumlu tutulur)
alter table public.user_stats
  add column if not exists total_tickets integer not null default 0,
  add column if not exists weekly_tickets integer not null default 0,
  add column if not exists lifetime_tickets integer not null default 0;

-- Mevcut tiket / haftalık havuz ile hizala (tek seferlik)
update public.user_stats
set total_tickets = coalesce(tiket, 0);

update public.user_stats
set lifetime_tickets = greatest(coalesce(lifetime_tickets, 0), coalesce(tiket, 0));

update public.user_stats u
set weekly_tickets = coalesce(w.tickets, 0)
from public.user_tickets w
where w.user_id = u.user_id::text
  and w.draw_week = extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

-- 2) İşlem günlüğü
create table if not exists public.cpx_ticket_transactions (
  id uuid primary key default gen_random_uuid(),
  trans_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  survey_id text,
  status text not null,
  survey_loi integer,
  tickets_added integer not null default 0,
  hash_verified boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  reversed_at timestamptz,
  reverses_trans_id text,
  created_at timestamptz not null default now(),
  constraint cpx_ticket_transactions_trans_id_key unique (trans_id)
);

create index if not exists cpx_ticket_transactions_user_created_idx
  on public.cpx_ticket_transactions (user_id, created_at desc);

create index if not exists cpx_ticket_transactions_reverses_idx
  on public.cpx_ticket_transactions (reverses_trans_id)
  where reverses_trans_id is not null;

alter table public.cpx_ticket_transactions enable row level security;

drop policy if exists "Service role only cpx_ticket_transactions" on public.cpx_ticket_transactions;
create policy "Service role only cpx_ticket_transactions"
  on public.cpx_ticket_transactions for all
  using (false)
  with check (false);

comment on table public.cpx_ticket_transactions is 'CPX Research postback events; tickets only, no monetary balance.';

-- 3) Atomik uygulama (service role / RPC)
create or replace function public.cpx_apply_postback(
  p_trans_id text,
  p_user_id uuid,
  p_status text,
  p_survey_id text,
  p_survey_loi integer,
  p_tickets_to_grant integer,
  p_reverse_of_trans_id text,
  p_hash_verified boolean,
  p_raw jsonb,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week integer;
  v_cur_weekly integer;
  v_apply integer;
  v_tgt record;
  v_n integer;
  v_uid_text text;
  i integer;
begin
  if exists (select 1 from public.cpx_ticket_transactions where trans_id = p_trans_id) then
    return jsonb_build_object('result', 'duplicate');
  end if;

  if not exists (select 1 from public.user_stats where user_id = p_user_id) then
    return jsonb_build_object('result', 'user_not_found');
  end if;

  v_uid_text := p_user_id::text;
  v_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;

  -- Tamamlanma veya bonus
  if p_status in ('1', '3') then
    v_n := greatest(1, coalesce(p_tickets_to_grant, 1));

    insert into public.cpx_ticket_transactions (
      trans_id, user_id, survey_id, status, survey_loi, tickets_added,
      hash_verified, raw_payload, processed_at
    ) values (
      p_trans_id, p_user_id, p_survey_id, p_status, p_survey_loi, v_n,
      p_hash_verified, coalesce(p_raw, '{}'::jsonb),
      coalesce(p_completed_at, now())
    );

    update public.user_stats
    set
      total_tickets = coalesce(total_tickets, 0) + v_n,
      tiket = coalesce(tiket, 0) + v_n,
      lifetime_tickets = coalesce(lifetime_tickets, 0) + v_n,
      updated_at = now()
    where user_id = p_user_id;

    select coalesce(tickets, 0) into v_cur_weekly
    from public.user_tickets
    where user_id = v_uid_text and draw_week = v_week;

    v_apply := least(v_n, greatest(0, 42 - coalesce(v_cur_weekly, 0)));
    if v_apply > 0 then
      perform public.upsert_user_ticket(v_uid_text, v_week, v_apply);
      for i in 1..v_apply loop
        insert into public.lottery_tickets (user_id, draw_week)
        values (v_uid_text, v_week);
      end loop;
    end if;

    update public.user_stats
    set
      weekly_tickets = coalesce(
        (select tickets from public.user_tickets where user_id = v_uid_text and draw_week = v_week),
        0
      ),
      updated_at = now()
    where user_id = p_user_id;

    return jsonb_build_object('result', 'ok', 'tickets_granted', v_n, 'lottery_entries_added', v_apply);
  end if;

  -- İade / iptal
  if p_status = '2' then
    if p_reverse_of_trans_id is not null and length(trim(p_reverse_of_trans_id)) > 0 then
      select * into v_tgt
      from public.cpx_ticket_transactions
      where trans_id = p_reverse_of_trans_id
        and user_id = p_user_id
        and status in ('1', '3')
        and reversed_at is null
        and tickets_added > 0
      for update;
    else
      select * into v_tgt
      from public.cpx_ticket_transactions
      where user_id = p_user_id
        and coalesce(survey_id, '') = coalesce(p_survey_id, '')
        and status in ('1', '3')
        and reversed_at is null
        and tickets_added > 0
      order by created_at desc
      limit 1
      for update;
    end if;

    if v_tgt.trans_id is null then
      insert into public.cpx_ticket_transactions (
        trans_id, user_id, survey_id, status, survey_loi, tickets_added,
        hash_verified, raw_payload, processed_at
      ) values (
        p_trans_id, p_user_id, p_survey_id, p_status, p_survey_loi, 0,
        p_hash_verified, coalesce(p_raw, '{}'::jsonb),
        coalesce(p_completed_at, now())
      );
      return jsonb_build_object('result', 'reversal_not_found');
    end if;

    v_n := v_tgt.tickets_added;

    update public.cpx_ticket_transactions
    set reversed_at = now()
    where trans_id = v_tgt.trans_id;

    insert into public.cpx_ticket_transactions (
      trans_id, user_id, survey_id, status, survey_loi, tickets_added,
      hash_verified, raw_payload, processed_at, reverses_trans_id
    ) values (
      p_trans_id, p_user_id, p_survey_id, p_status, p_survey_loi, -v_n,
      p_hash_verified, coalesce(p_raw, '{}'::jsonb),
      coalesce(p_completed_at, now()),
      v_tgt.trans_id
    );

    update public.user_stats
    set
      total_tickets = greatest(0, coalesce(total_tickets, 0) - v_n),
      tiket = greatest(0, coalesce(tiket, 0) - v_n),
      lifetime_tickets = greatest(0, coalesce(lifetime_tickets, 0) - v_n),
      updated_at = now()
    where user_id = p_user_id;

    -- Haftalık havuz ve bilet satırları
    select coalesce(tickets, 0) into v_cur_weekly
    from public.user_tickets
    where user_id = v_uid_text and draw_week = v_week;

    v_apply := least(v_n, coalesce(v_cur_weekly, 0));
    if v_apply > 0 then
      update public.user_tickets
      set tickets = greatest(0, tickets - v_apply), updated_at = now()
      where user_id = v_uid_text and draw_week = v_week;

      delete from public.lottery_tickets
      where id in (
        select id from public.lottery_tickets
        where user_id = v_uid_text and draw_week = v_week
        order by created_at desc nulls last, id desc
        limit v_apply
      );
    end if;

    update public.user_stats
    set
      weekly_tickets = coalesce(
        (select tickets from public.user_tickets where user_id = v_uid_text and draw_week = v_week),
        0
      ),
      updated_at = now()
    where user_id = p_user_id;

    return jsonb_build_object('result', 'ok', 'tickets_revoked', v_n);
  end if;

  return jsonb_build_object('result', 'ignored', 'reason', 'unknown_status');
end;
$$;

grant execute on function public.cpx_apply_postback(
  text, uuid, text, text, integer, integer, text, boolean, jsonb, timestamptz
) to service_role;

comment on function public.cpx_apply_postback is 'CPX ticket-only postback: grant (status 1/3) or revoke (2). Idempotent by trans_id.';
