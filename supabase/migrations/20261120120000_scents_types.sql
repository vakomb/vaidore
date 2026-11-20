-- v15: automatinis produktų pridėjimas.
--  • 5 prekių tipai: kvepalai, difuzoriai (su lazdelėmis), zvakes, aliejai (elektriniams difuzoriams),
--    elektriniai-difuzoriai (prietaisas, be kvapo). Esamos reikšmės nekeičiamos.
--  • products.attrs – tipui būdingos savybės (ml, lazdelės, svoris, degimo trukmė…), products.occasions – progos.
--  • scents – bendras kvapas keliems produktams (kvepalai, difuzorius, žvakė, aliejus): automatinio užpildymo šaltinis.
--    products.scent_id – nuoroda; produktas toliau turi savo laukų kopijas (parduotuvė ir filtrai nekeičiami).
-- Galima paleisti kelis kartus be žalos.

alter table public.products drop constraint if exists products_type_check;
alter table public.products
  add constraint products_type_check check (type in ('kvepalai', 'difuzoriai', 'zvakes', 'aliejai', 'elektriniai-difuzoriai'));
alter table public.products add column if not exists attrs jsonb not null default '{}';
alter table public.products add column if not exists occasions text[] not null default '{}';

create table if not exists public.scents (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  inspired text not null default '',
  gender text not null default 'unisex' check (gender in ('moterims', 'vyrams', 'unisex')),
  family text references public.families (id) on update cascade on delete set null,
  notes jsonb not null default '{"top": [], "heart": [], "base": []}',
  seasons text[] not null default '{}',
  times text[] not null default '{diena}',
  occasions text[] not null default '{}',
  longevity int not null default 3 check (longevity between 1 and 5),
  sillage int not null default 3 check (sillage between 1 and 5),
  look jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products add column if not exists scent_id text references public.scents (id) on update cascade on delete set null;
create index if not exists products_scent_idx on public.products (scent_id);

alter table public.scents enable row level security;
drop policy if exists "scents: visi mato" on public.scents;
create policy "scents: visi mato" on public.scents for select using (true);
drop policy if exists "scents: admin keičia" on public.scents;
create policy "scents: admin keičia" on public.scents for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop trigger if exists scents_touch on public.scents;
create trigger scents_touch before update on public.scents for each row execute function public.touch_updated_at();
drop trigger if exists scents_audit on public.scents;
create trigger scents_audit after insert or update or delete on public.scents for each row execute function public.vd_audit();

-- ── Esamų prekių susiejimas ──
-- 1) Kiekvieni kvepalai – kvapas (id iš pavadinimo), duomenys iš kvepalų
insert into public.scents (id, name, inspired, gender, family, notes, seasons, times, occasions, longevity, sillage, look)
select distinct on (sid)
  sid, p.name, p.inspired, p.gender, p.family, p.notes, p.seasons, p.times, p.occasions, p.longevity, p.sillage,
  jsonb_strip_nulls(jsonb_build_object('liquid', p.look ->> 'liquid', 'tint', p.look ->> 'tint'))
from (
  select *, trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) as sid
  from public.products where type = 'kvepalai'
) p
where p.sid <> ''
order by sid, p.rank, p.created_at
on conflict (id) do nothing;
update public.products p
set scent_id = s.id
from public.scents s
where p.type = 'kvepalai' and p.scent_id is null
  and s.id = trim(both '-' from regexp_replace(lower(p.name), '[^a-z0-9]+', '-', 'g'));

-- 2) Kitos prekės (be elektrinių difuzorių): pagal pavadinimą be tipo žodžio („Difuzorius LIBRADORE“ → LIBRADORE)
update public.products p
set scent_id = s.id
from public.scents s
where p.scent_id is null and p.type not in ('kvepalai', 'elektriniai-difuzoriai')
  and upper(s.name) = upper(trim(regexp_replace(p.name,
    '^\s*(difuzorius|namų kvapų difuzorius|kvapni žvakė|kvapioji žvakė|žvakė|aromatinis aliejus|kvapusis aliejus|aliejus)\s+', '', 'i')));

-- 3) Likusios – pagal originalo kvapą (dalis po paskutinio brūkšnio: „… – Si Red“), jei atitinka vienintelį kvapą
with tails as (
  select id, regexp_replace(lower(regexp_replace(inspired, '^.*[-–—]\s*', '')), '[^a-z0-9]+', '', 'g') as tail
  from public.scents where inspired <> ''
),
uniq as (select tail, min(id) as id from tails where tail <> '' group by tail having count(*) = 1)
update public.products p
set scent_id = u.id
from uniq u
where p.scent_id is null and p.type not in ('kvepalai', 'elektriniai-difuzoriai') and p.inspired <> ''
  and u.tail = regexp_replace(lower(regexp_replace(p.inspired, '^.*[-–—]\s*', '')), '[^a-z0-9]+', '', 'g');
