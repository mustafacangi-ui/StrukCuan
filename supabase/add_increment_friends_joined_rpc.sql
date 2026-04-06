-- Add RPC for incrementing friends_joined
-- Use this in Stage 2 Receipt Reward

create or replace function public.increment_friends_joined(p_user_id text)
returns void
language plpgsql
security definer
as $$
begin
  update public.user_stats
  set friends_joined = friends_joined + 1
  where user_id = p_user_id;
end;
$$;
