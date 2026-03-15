-- Tables for Weekly Draw page
-- Run in Supabase SQL Editor if lottery_tickets or weekly_winners don't exist

-- lottery_tickets: stores tickets for the weekly draw
create table if not exists public.lottery_tickets (
  id bigserial primary key,
  user_id text not null,
  draw_week integer not null,
  created_at timestamptz default now()
);

create index if not exists lottery_tickets_draw_week_idx on public.lottery_tickets (draw_week);

-- weekly_winners: stores past winners
create table if not exists public.weekly_winners (
  id bigserial primary key,
  ticket_id text,
  ticket_number text,
  prize numeric default 50,
  user_id text,
  created_at timestamptz default now()
);

create index if not exists weekly_winners_created_at_idx on public.weekly_winners (created_at desc);

-- RLS
alter table public.lottery_tickets enable row level security;
alter table public.weekly_winners enable row level security;

-- Allow authenticated users to read lottery_tickets (for count)
create policy "Users can read lottery_tickets"
  on public.lottery_tickets for select
  to authenticated
  using (true);

-- Allow authenticated users to read weekly_winners
create policy "Users can read weekly_winners"
  on public.weekly_winners for select
  to authenticated
  using (true);
