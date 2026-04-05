-- Supabase SQL Editor'da çalıştırınız.
-- Fırsat (Deal) onaylandığında (statü 'pending' den 'active' olduğunda)
-- Red Label fırsatlar için 3, diğerleri için 1 bilet veren Trigger.

create or replace function public.handle_deal_activation_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_uuid uuid;
  v_user_text text;
  v_draw_week integer;
  v_tickets_to_add integer;
  i integer;
  v_cur integer;
  v_add integer;
begin
  -- Sadece durum 'pending' den 'active' e geçerken tetiklensin
  if (old.status = 'pending' and new.status = 'active') then
     
    -- deals tablosunda user_id null değilse ödülü yatır
    if new.user_id is not null then
      begin
        v_user_text := new.user_id;
        v_user_uuid := new.user_id::uuid;
      exception
        when invalid_text_representation then
          return new;
      end;

      v_draw_week := extract(week from (now() at time zone 'Asia/Jakarta'))::integer;
      
      -- Red Label kontrolü: Red Label ise 3, değilse 1 bilet
      if coalesce(new.is_red_label, false) then
        v_tickets_to_add := 3;
      else
        v_tickets_to_add := 1;
      end if;

      -- 1. user_stats tablosundaki bilet bakiyesini güncelle (Hata raporlarından biliyoruz ki user_stats.user_id UUID bekliyor)
      begin
        insert into public.user_stats (user_id, tiket)
        values (v_user_uuid, v_tickets_to_add)
        on conflict (user_id)
        do update set
          tiket = coalesce(public.user_stats.tiket, 0) + v_tickets_to_add,
          updated_at = now();
      exception when others then
          -- Fail-safe: eğer TEXT bekliyorsa diye
          insert into public.user_stats (user_id, tiket)
          values (v_user_text, v_tickets_to_add)
          on conflict (user_id)
          do update set
            tiket = coalesce(public.user_stats.tiket, 0) + v_tickets_to_add,
            updated_at = now();
      end;

      -- 2. Haftalık toplamı izlemek için upsert_user_ticket'i çağır 
      -- (Hata raporundan biliyoruz ki upsert_user_ticket(uuid, int, int) yok, bu yüzden TEXT gönderiyoruz)
      begin
        perform public.upsert_user_ticket(v_user_text, v_draw_week, v_tickets_to_add);
      exception when others then
        -- Eğer UUID bekleyen bir fonksiyon varsa
        perform public.upsert_user_ticket(v_user_uuid, v_draw_week, v_tickets_to_add);
      end;
      
      -- 3. Haftalık çekiliş limitine kadar bilet başına lottery_tickets kaydı oluştur
      -- user_tickets tablosundan güncel bilet sayısını al (Önce text ile dene, fail olursa uuid)
      begin
        select coalesce(tickets, 0) into v_cur
        from public.user_tickets
        where user_id::text = v_user_text and draw_week = v_draw_week;
      exception when others then
        v_cur := 0;
      end;

      v_add := least(v_tickets_to_add, greatest(0, 42 - v_cur));
      if v_add > 0 then
        begin
          for i in 1..v_add loop
            insert into public.lottery_tickets (user_id, draw_week)
            values (v_user_text, v_draw_week);
          end loop;
        exception when others then
          for i in 1..v_add loop
            insert into public.lottery_tickets (user_id, draw_week)
            values (v_user_uuid, v_draw_week);
          end loop;
        end;
      end if;

      -- 4. Kullanıcıya bildirim gönder (notifications tablosu beklentisi: TEXT)
      begin
        insert into public.notifications (user_id, title, message)
        values (
          v_user_text,
          'Fırsat Onaylandı',
          'Paylaştığınız fırsat onaylandı! ' || v_tickets_to_add || ' bilet kazandınız.'
        );
      exception when others then
        insert into public.notifications (user_id, title, message)
        values (
          v_user_uuid::text,
          'Fırsat Onaylandı',
          'Paylaştığınız fırsat onaylandı! ' || v_tickets_to_add || ' bilet kazandınız.'
        );
      end;

    end if;
  end if;
  
  return new;
end;
$$;

-- Mevcut trigger varsa kaldır
drop trigger if exists on_deal_activation on public.deals;

-- Trigger'ı oluştur (NEW.status değişikliği dinlenecek)
create trigger on_deal_activation
  after update of status on public.deals
  for each row
  execute function public.handle_deal_activation_rewards();
