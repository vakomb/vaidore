-- v13: prekės tipas – kvepalai / difuzoriai / aliejai (pradžios plytelės, meniu, katalogo puslapiai /kvepalai,
-- /difuzoriai, /aliejai). Lytis, mėginukas 2 ml, koncentracija ir talpos 33 / 100 ml – tik kvepalams.
alter table public.products add column if not exists type text not null default 'kvepalai';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_type_check') then
    alter table public.products add constraint products_type_check check (type in ('kvepalai', 'difuzoriai', 'aliejai'));
  end if;
end $$;
-- Jau įvesti difuzoriai (adresas ar pavadinimas su „difuzor“ / „diffuzor“) – tipas „difuzoriai“, be mėginuko
update public.products
set type = 'difuzoriai', sample = 0
where type = 'kvepalai' and (id ~* 'dif+uzor' or name ~* 'dif+uzor');
update public.products
set type = 'aliejai', sample = 0
where type = 'kvepalai' and (id ~* 'aliej' or name ~* 'aliej');
