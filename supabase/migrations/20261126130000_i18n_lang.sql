-- v33e: pirkėjo kalba - laiškai ir nuorodos jo kalba (lt / en). Esami įrašai - lietuviškai.
-- RLS: stulpelių pridėjimas politikų nekeičia; naujienlaiškio ir „Pranešti, kai bus“ įrašymo politikos leidžia ir „lang“
-- (tikrinama check - tik lt / en).
alter table public.orders add column if not exists lang text not null default 'lt';
alter table public.newsletter add column if not exists lang text not null default 'lt';
alter table public.restock_requests add column if not exists lang text not null default 'lt';
do $$ begin
  alter table public.orders add constraint orders_lang_chk check (lang in ('lt', 'en'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.newsletter add constraint newsletter_lang_chk check (lang in ('lt', 'en'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.restock_requests add constraint restock_lang_chk check (lang in ('lt', 'en'));
exception when duplicate_object then null; end $$;

-- Pirkėjas naujienlaiškio įraše gali nurodyti ir kalbą (kiti stulpeliai - kaip anksčiau: el. paštas, šaltinis)
grant insert (lang) on public.newsletter to anon, authenticated;

-- Užsakymo įrašymas (vieną kartą) - ir kalba
create or replace function public.vd_record_order(o jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  inserted boolean := false;
  it jsonb;
  pid text;
begin
  insert into public.orders (ref, stripe_session, payment_intent, user_id, email, name, phone, items, product_ids,
                             amount_total, amount_shipping, shipping, gift, credit_code, lang)
  values (o ->> 'ref', o ->> 'stripe_session', o ->> 'payment_intent', nullif(o ->> 'user_id', '')::uuid,
          coalesce(o ->> 'email', ''), coalesce(o ->> 'name', ''), coalesce(o ->> 'phone', ''),
          coalesce(o -> 'items', '[]'), coalesce(array(select jsonb_array_elements_text(o -> 'product_ids')), '{}'),
          coalesce((o ->> 'amount_total')::int, 0), coalesce((o ->> 'amount_shipping')::int, 0),
          coalesce(o -> 'shipping', '{}'), o -> 'gift', o ->> 'credit_code',
          case when o ->> 'lang' = 'en' then 'en' else 'lt' end)
  on conflict (stripe_session) do nothing;
  get diagnostics inserted = row_count;
  if inserted then
    for it in select * from jsonb_array_elements(coalesce(o -> 'items', '[]')) loop
      if it ? 'picks' then
        for pid in select jsonb_array_elements_text(it -> 'picks') loop
          update public.products set stock = greatest(stock - (it ->> 'qty')::int, 0) where id = pid and stock is not null;
        end loop;
      elsif coalesce((it ->> 'ml')::int, 0) > 2 then
        -- mėginukai (2 ml) išpilstomi iš atskiros talpos - buteliukų likutis mažinamas tik perkant buteliuką
        update public.products set stock = greatest(stock - (it ->> 'qty')::int, 0) where id = it ->> 'id' and stock is not null;
      end if;
    end loop;
    update public.orders set stock_applied = true where stripe_session = o ->> 'stripe_session';
  end if;
  return inserted;
end $$;
revoke all on function public.vd_record_order(jsonb) from public, anon, authenticated;
grant execute on function public.vd_record_order(jsonb) to service_role;
