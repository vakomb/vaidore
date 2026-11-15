-- Vaidore kvapai: laukas „inspired“ (kokiu žinomu kvapu įkvėptas, pvz. „Tom Ford – Tobacco Vanille“)
-- ir 12 pavyzdinių kvapų pakeitimas 10 tikrų Vaidore kvapų (supabase/seed.sql juos įrašo).
-- Paleisti SQL Editor'iuje po ankstesnių migracijų, tada – supabase/seed.sql.
alter table public.products add column if not exists inspired text not null default '' check (char_length(inspired) <= 120);

-- Pavyzdiniai kvapai (tik jei jų vis dar yra; atsiliepimai / „Pranešti, kai bus“ jiems ištrinami kartu)
delete from public.products
where id in ('rasa', 'gintaras', 'baltijos-pusys', 'liepu-medus', 'juodasis-azuolas', 'jura', 'vakaro-silkas',
             'pelynas', 'smilga', 'ausra', 'ruta', 'ziemos-ugnis');

-- Nustatymai: pagrindinis kvapas skaidrėje ir „Įkvėpti …“ rodymas (tik jei dar rodo į pavyzdinį kvapą)
update public.settings
set data = data
  || jsonb_build_object('hero', jsonb_build_object('product', 'vanor', 'eyebrow', 'Žiemos kolekcija', 'title', 'Vanor',
                                                   'text', 'Tabakas, vanilė ir kakava – šilčiausias sezono kvapas.'))
  || jsonb_build_object('tagline', 'Prabangių kvapų įkvėpti Vaidore kvepalai. Pirma išbandykite 2 ml mėginuką.')
  || jsonb_build_object('inspired', coalesce(data -> 'inspired', jsonb_build_object('show', true,
       'note', 'Prekių ženklai priklauso jų savininkams. Vaidore su jais nesusijusi – pavadinimas nurodo tik kvapo kryptį.')))
where id = 1 and coalesce(data #>> '{hero,product}', 'ziemos-ugnis') in
  ('rasa', 'gintaras', 'baltijos-pusys', 'liepu-medus', 'juodasis-azuolas', 'jura', 'vakaro-silkas', 'pelynas', 'smilga',
   'ausra', 'ruta', 'ziemos-ugnis');

-- Nuotraukų įkėlimas: administratorius gali ir skaityti savo įkeltus failus (reikia Storage API atsakymams)
drop policy if exists "products bucket: admin skaito" on storage.objects;
create policy "products bucket: admin skaito" on storage.objects for select to authenticated using (bucket_id = 'products' and (select public.is_admin()));
