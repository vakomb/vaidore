-- Vaidore e-parduotuvė: katalogas, nustatymai, paskyros, užsakymai, atsiliepimai, užklausos, žurnalas, nuotraukos.
-- Saugumas: RLS visose lentelėse. Administratorius – el. paštas lentelėje admin_emails, kurio paskyra PATVIRTINTA
-- (auth.users.email_confirmed_at). Slaptažodžių čia nėra – paskyrą savininkas susikuria Supabase skydelyje.

-- ── Administratorius ─────────────────────────────────────
create table public.admin_emails (email text primary key check (email = lower(email)));
alter table public.admin_emails enable row level security; -- jokių politikų: matoma tik serveriui
insert into public.admin_emails (email) values ('vakomb@gmail.com');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u join public.admin_emails a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Patvirtintas dabartinio vartotojo el. paštas (null, jei nepatvirtintas) – užsakymams be paskyros susieti
create or replace function public.my_confirmed_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;
revoke all on function public.my_confirmed_email() from public;
grant execute on function public.my_confirmed_email() to authenticated, service_role;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ── Katalogas ────────────────────────────────────────────
create table public.families (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  hint text not null default '',
  sort int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  image text not null default '',
  sort int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  conc text not null default 'EDP' check (conc in ('EDT', 'EDP', 'Parfum', 'Extrait')),
  gender text not null default 'unisex' check (gender in ('moterims', 'vyrams', 'unisex')),
  family text not null references public.families (id) on update cascade,
  tagline text not null default '',
  description text not null default '',
  notes jsonb not null default '{"top":[],"heart":[],"base":[]}',
  longevity int not null default 3 check (longevity between 1 and 5),
  sillage int not null default 3 check (sillage between 1 and 5),
  seasons text[] not null default '{}',
  times text[] not null default '{diena}',
  sizes jsonb not null default '[]',
  sample numeric(8, 2) not null default 4.90 check (sample >= 0),
  look jsonb not null default '{"liquid":"#E8D9C4","tint":"#F7F1E8","cap":"gold","shape":"rect"}',
  badge text,
  rank int not null default 100,
  added date not null default current_date,
  stock int check (stock is null or stock >= 0),
  images text[] not null default '{}',
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_family_idx on public.products (family);
create table public.product_categories (
  product_id text not null references public.products (id) on update cascade on delete cascade,
  category_id text not null references public.categories (id) on update cascade on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_cat_idx on public.product_categories (category_id);
create table public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger families_touch before update on public.families for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

alter table public.families enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.settings enable row level security;

create policy "families: visi mato matomas" on public.families for select using (visible or (select public.is_admin()));
create policy "families: admin keičia" on public.families for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categories: visi mato matomas" on public.categories for select using (visible or (select public.is_admin()));
create policy "categories: admin keičia" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: visi mato matomus" on public.products for select using (visible or (select public.is_admin()));
create policy "products: admin keičia" on public.products for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_categories: visi mato" on public.product_categories for select using (true);
create policy "product_categories: admin keičia" on public.product_categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "settings: visi mato" on public.settings for select using (true);
create policy "settings: admin keičia" on public.settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Paskyros ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text not null default '',
  address jsonb,            -- { name, line1, line2, city, postal, country }
  locker jsonb,             -- mėgstamas Omniva paštomatas { zip, name, addr, city, cc }
  favorites text[] not null default '{}',
  stripe_customer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
create policy "profiles: savo" on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: savo keičia" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- stripe_customer ir email keičia tik serveris
revoke update (stripe_customer, email) on public.profiles from authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ── Užsakymai (įrašo tik serveris – Stripe webhook) ───────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,                 -- užsakymo nr. (8 simboliai)
  stripe_session text not null unique,
  payment_intent text,
  user_id uuid references auth.users (id) on delete set null,
  email text not null default '',
  name text not null default '',
  phone text not null default '',
  status text not null default 'paid' check (status in ('paid', 'packed', 'shipped', 'delivered', 'refunded', 'cancelled')),
  items jsonb not null default '[]',        -- [{ id, ml, qty, name, unit, total, picks? }]
  product_ids text[] not null default '{}', -- atsiliepimams ir paieškai
  amount_total int not null default 0,      -- centais
  amount_shipping int not null default 0,
  shipping jsonb not null default '{}',     -- { method, locker | address }
  gift jsonb,                               -- { note }
  credit_code text,
  tracking text,
  stock_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz
);
create index orders_user_idx on public.orders (user_id);
create index orders_email_idx on public.orders (lower(email));
create index orders_created_idx on public.orders (created_at desc);
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
alter table public.orders enable row level security;
-- Pirkėjas mato savo užsakymus: pagal paskyrą arba pagal patvirtintą el. paštą (užsakyta be paskyros)
create policy "orders: savo" on public.orders for select to authenticated using (
  user_id = (select auth.uid())
  or lower(email) = (select public.my_confirmed_email())
  or (select public.is_admin())
);
create policy "orders: admin keičia" on public.orders for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Užsakymo įrašymas + likučių mažinimas vienoje transakcijoje; kartojant (Stripe pakartoja webhook) – nieko nedaro
create or replace function public.vd_record_order(o jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  inserted boolean := false;
  it jsonb;
  pid text;
begin
  insert into public.orders (ref, stripe_session, payment_intent, user_id, email, name, phone, items, product_ids,
                             amount_total, amount_shipping, shipping, gift, credit_code)
  values (o ->> 'ref', o ->> 'stripe_session', o ->> 'payment_intent', nullif(o ->> 'user_id', '')::uuid,
          coalesce(o ->> 'email', ''), coalesce(o ->> 'name', ''), coalesce(o ->> 'phone', ''),
          coalesce(o -> 'items', '[]'), coalesce(array(select jsonb_array_elements_text(o -> 'product_ids')), '{}'),
          coalesce((o ->> 'amount_total')::int, 0), coalesce((o ->> 'amount_shipping')::int, 0),
          coalesce(o -> 'shipping', '{}'), o -> 'gift', o ->> 'credit_code')
  on conflict (stripe_session) do nothing;
  get diagnostics inserted = row_count;
  if inserted then
    for it in select * from jsonb_array_elements(coalesce(o -> 'items', '[]')) loop
      if it ? 'picks' then
        for pid in select jsonb_array_elements_text(it -> 'picks') loop
          update public.products set stock = greatest(stock - (it ->> 'qty')::int, 0) where id = pid and stock is not null;
        end loop;
      elsif coalesce((it ->> 'ml')::int, 0) > 2 then
        -- mėginukai (2 ml) išpilstomi iš atskiros talpos – buteliukų likutis mažinamas tik perkant buteliuką
        update public.products set stock = greatest(stock - (it ->> 'qty')::int, 0) where id = it ->> 'id' and stock is not null;
      end if;
    end loop;
    update public.orders set stock_applied = true where stripe_session = o ->> 'stripe_session';
  end if;
  return inserted;
end $$;
revoke all on function public.vd_record_order(jsonb) from public, anon, authenticated;
grant execute on function public.vd_record_order(jsonb) to service_role;

-- Grąžinus pinigus – likutis grąžinamas (vieną kartą)
create or replace function public.vd_refund_order(order_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  it jsonb;
  pid text;
begin
  select * into o from public.orders where id = order_id for update;
  if not found or o.status = 'refunded' then return false; end if;
  if o.stock_applied then
    for it in select * from jsonb_array_elements(o.items) loop
      if it ? 'picks' then
        for pid in select jsonb_array_elements_text(it -> 'picks') loop
          update public.products set stock = stock + (it ->> 'qty')::int where id = pid and stock is not null;
        end loop;
      elsif coalesce((it ->> 'ml')::int, 0) > 2 then
        update public.products set stock = stock + (it ->> 'qty')::int where id = it ->> 'id' and stock is not null;
      end if;
    end loop;
  end if;
  update public.orders set status = 'refunded', stock_applied = false where id = order_id;
  return true;
end $$;
revoke all on function public.vd_refund_order(uuid) from public, anon, authenticated;
grant execute on function public.vd_refund_order(uuid) to service_role;

-- ── Atsiliepimai (tik pirkę; rodomi patvirtinti) ───────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on update cascade on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  text text not null check (char_length(text) between 10 and 1200),
  rating int check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  verified boolean not null default true,
  created_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id) where status = 'approved';
alter table public.reviews enable row level security;
create policy "reviews: visi mato patvirtintus" on public.reviews for select using (status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "reviews: rašo tik pirkę" on public.reviews for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'pending' and verified
  and exists (
    select 1 from public.orders o
    where (o.user_id = (select auth.uid()) or lower(o.email) = (select public.my_confirmed_email()))
      and o.status in ('paid', 'packed', 'shipped', 'delivered') and product_id = any (o.product_ids)
  )
);
create policy "reviews: admin keičia" on public.reviews for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reviews: admin trina" on public.reviews for delete to authenticated using ((select public.is_admin()));

-- ── „Pranešti, kai bus“ ───────────────────────────────────
create table public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on update cascade on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and char_length(email) <= 200),
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, email)
);
alter table public.restock_requests enable row level security;
create policy "restock: bet kas užsiregistruoja" on public.restock_requests for insert to anon, authenticated with check (notified = false);
create policy "restock: admin mato" on public.restock_requests for select to authenticated using ((select public.is_admin()));
create policy "restock: admin keičia" on public.restock_requests for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "restock: admin trina" on public.restock_requests for delete to authenticated using ((select public.is_admin()));

-- ── Veiksmų žurnalas ─────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  changes jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
create policy "audit: admin mato" on public.audit_log for select to authenticated using ((select public.is_admin()));

create or replace function public.vd_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  diff jsonb := '{}';
  k text;
  oldj jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  newj jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  eid text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(newj) loop
      if k <> 'updated_at' and (oldj -> k) is distinct from (newj -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('buvo', oldj -> k, 'dabar', newj -> k));
      end if;
    end loop;
    if diff = '{}' then return new; end if;
  elsif tg_op = 'INSERT' then
    diff := newj;
  else
    diff := oldj;
  end if;
  eid := coalesce(newj ->> 'id', oldj ->> 'id', newj ->> 'product_id', oldj ->> 'product_id');
  insert into public.audit_log (actor, actor_email, action, entity, entity_id, changes)
  values (auth.uid(), (select auth.jwt()) ->> 'email', lower(tg_op), tg_table_name, eid, diff);
  return coalesce(new, old);
end $$;
create trigger products_audit after insert or update or delete on public.products for each row execute function public.vd_audit();
create trigger categories_audit after insert or update or delete on public.categories for each row execute function public.vd_audit();
create trigger families_audit after insert or update or delete on public.families for each row execute function public.vd_audit();
create trigger settings_audit after update on public.settings for each row execute function public.vd_audit();
create trigger orders_audit after update on public.orders for each row execute function public.vd_audit();
create trigger reviews_audit after update or delete on public.reviews for each row execute function public.vd_audit();
create trigger product_categories_audit after insert or delete on public.product_categories for each row execute function public.vd_audit();

-- ── Nuotraukos (Storage) ─────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy "products bucket: admin įkelia" on storage.objects for insert to authenticated with check (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin keičia" on storage.objects for update to authenticated using (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin trina" on storage.objects for delete to authenticated using (bucket_id = 'products' and (select public.is_admin()));
