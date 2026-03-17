-- Kullanıcının ülkesini güncelle (test için)
-- Supabase SQL Editor'da çalıştırın.

create or replace function public.update_user_country(p_country_code char(2))
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text;
begin
  uid := auth.uid()::text;
  if uid is null then
    raise exception 'User not authenticated';
  end if;
  if p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;

  update public.user_stats
  set country_code = upper(p_country_code), updated_at = now()
  where user_id::text = uid;

  if not found then
    insert into public.user_stats (user_id, country_code)
    values (uid::text, upper(p_country_code))
    on conflict (user_id) do update set country_code = upper(p_country_code), updated_at = now();
  end if;
end;
$$;

grant execute on function public.update_user_country(char(2)) to authenticated;
