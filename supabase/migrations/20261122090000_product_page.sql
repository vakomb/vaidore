-- v29: prekės puslapio turinys pagal kategoriją.
--  • products.subtitle – paantraštė po pavadinimu (tuščia – pagal prekės tipą, kvepalams „Eau de Parfum · Unisex“).
--  • Nuotaikos juosta (nuotrauka ir dvi teksto eilutės): bendram kvapui (scents.mood_*) – visoms jo formoms (kvepalai,
--    difuzorius, žvakė, aliejus); produkto laukai (products.mood_*) – jei užpildyti, perrašo kvapo.
--  • note_media – natų biblioteka: natos pavadinimas → nuotrauka (tikras ingredientas, iškirptas iš produkto nuotraukos
--    administravime: Katalogas → Natos). Viena nuotrauka rodoma visuose produktuose su ta nata.
-- Galima paleisti kelis kartus be žalos.

alter table public.products add column if not exists subtitle text not null default '' check (char_length(subtitle) <= 80);
alter table public.products add column if not exists mood_image text not null default '' check (char_length(mood_image) <= 500);
alter table public.products add column if not exists mood_title text not null default '' check (char_length(mood_title) <= 60);
alter table public.products add column if not exists mood_line text not null default '' check (char_length(mood_line) <= 90);

alter table public.scents add column if not exists mood_image text not null default '' check (char_length(mood_image) <= 500);
alter table public.scents add column if not exists mood_title text not null default '' check (char_length(mood_title) <= 60);
alter table public.scents add column if not exists mood_line text not null default '' check (char_length(mood_line) <= 90);

create table if not exists public.note_media (
  name text primary key check (char_length(btrim(name)) between 1 and 60),
  image text not null check (char_length(image) between 1 and 500),
  updated_at timestamptz not null default now()
);
alter table public.note_media enable row level security;
drop policy if exists "note_media: visi mato" on public.note_media;
create policy "note_media: visi mato" on public.note_media for select using (true);
drop policy if exists "note_media: admin keičia" on public.note_media;
create policy "note_media: admin keičia" on public.note_media for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop trigger if exists note_media_touch on public.note_media;
create trigger note_media_touch before update on public.note_media for each row execute function public.touch_updated_at();

-- Žurnalas: įrašo identifikatorius – id, product_id arba (natų bibliotekoje) name
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
  eid := coalesce(newj ->> 'id', oldj ->> 'id', newj ->> 'product_id', oldj ->> 'product_id', newj ->> 'name', oldj ->> 'name');
  insert into public.audit_log (actor, actor_email, action, entity, entity_id, changes)
  values (auth.uid(), (select auth.jwt()) ->> 'email', lower(tg_op), tg_table_name, eid, diff);
  return coalesce(new, old);
end $$;
revoke execute on function public.vd_audit() from public, anon, authenticated;
drop trigger if exists note_media_audit on public.note_media;
create trigger note_media_audit after insert or update or delete on public.note_media for each row execute function public.vd_audit();
