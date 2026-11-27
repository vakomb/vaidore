-- v34c: kaitinami vaškai (ravina.pl - tik inspiracijos, 16 kvapų), 56 g, sojų vaškas, 4,99 €.
-- Kvapas, originalas, natos (pagrindinės, kaip žvakėms), šeima, lytis, spalvos ir šūkis - iš to paties kvapo žvakės (arba aliejaus),
-- aprašymas - tas pats charakteris ir nuotaika, naudojimo sakinys - vaškui. Nuotraukų dar nėra - parduotuvė rodo plokštelės piešinį.
with pick as (
  select distinct on (p.scent_id) p.*
  from public.products p
  where p.scent_id = any (array['opiudore', 'belladore', 'sired', 'madore', 'eufodore', 'sauvadore', 'nifodore', 'angedore',
                                'amodore', 'goodore', 'cledore', 'jadore', 'creedore', 'crydore', 'deladore', 'mavidore'])
    and p.type in ('zvakes', 'aliejai')
  order by p.scent_id, (p.type = 'zvakes') desc, p.rank
), core as (
  select p.*,
    regexp_replace(p.name, '^(Kvapni žvakė|Aromatinis aliejus)\s+', '') as nm,
    coalesce(nullif(p.inspired_image, ''), (select q.inspired_image from public.products q where q.scent_id = p.scent_id and coalesce(q.inspired_image, '') <> '' limit 1), '') as ii,
    row_number() over (order by array_position(array['opiudore', 'belladore', 'sired', 'madore', 'eufodore', 'sauvadore', 'nifodore', 'angedore',
                                'amodore', 'goodore', 'cledore', 'jadore', 'creedore', 'crydore', 'deladore', 'mavidore'], p.scent_id)) as n
  from pick p
)
insert into public.products (id, name, type, scent_id, conc, gender, family, tagline, description, notes, longevity, sillage, sizes, sample, look, badge, rank, stock, images, visible, inspired, inspired_image, attrs, i18n)
select 'kaitinamas-vaskas-' || scent_id, 'Kaitinamas vaškas ' || nm, 'vaskai', scent_id, 'EDP', gender, family, tagline,
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(description,
    '^(Kvapni žvakė|Aromatinis aliejus)\s+', 'Kaitinamas vaškas '),
    ' aromatas (jaukiai namų atmosferai|elektriniams difuzoriams ir drėkintuvams)\.', ' aromatas jūsų aromalempai.'),
    'Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi\.', 'Įdėkite 1-2 kubelius į aromalempos dubenėlį ir uždekite arbatinę žvakutę - vaškas pamažu ištirpsta ir ilgai skleidžia kvapą. Pagamintas iš sojų vaško.'),
    'Užtenka kelių lašų į difuzoriaus vandenį - kvapas tolygiai pasklinda po visą patalpą\. Skirtas tik patalpoms aromatizuoti\.', 'Įdėkite 1-2 kubelius į aromalempos dubenėlį ir uždekite arbatinę žvakutę - vaškas pamažu ištirpsta ir ilgai skleidžia kvapą. Pagamintas iš sojų vaško.'),
  notes, 3, 3, '[{"ml": 56, "unit": "g", "price": 4.99}]'::jsonb, 0, look, 'Naujiena', 80 + n::int, null, '{}'::text[], true, inspired, ii,
  '{"forBurner": true, "wax": "Sojų vaškas"}'::jsonb,
  jsonb_build_object('en', jsonb_build_object(
    'name', 'Wax melt ' || nm,
    'tagline', i18n->'en'->>'tagline',
    'badge', 'New',
    'description', regexp_replace(regexp_replace(regexp_replace(regexp_replace(i18n->'en'->>'description',
      '^(Scented candle|Fragrance oil)\s+', 'Wax melt '),
      ' fragrance (for a cosy home|for electric diffusers and humidifiers)\.', ' fragrance for your wax burner.'),
      'On the first burn, let it burn for at least an hour so the wax melts evenly across the whole surface\.', 'Place 1-2 cubes in the bowl of a wax burner and light a tealight underneath - the wax slowly melts and releases its fragrance for a long time. Made with soy wax.'),
      'A few drops in your diffuser''s water are enough - the scent spreads evenly through the whole room\. For room fragrancing only\.', 'Place 1-2 cubes in the bowl of a wax burner and light a tealight underneath - the wax slowly melts and releases its fragrance for a long time. Made with soy wax.')))
from core
on conflict (id) do update set name = excluded.name, type = excluded.type, scent_id = excluded.scent_id, gender = excluded.gender, family = excluded.family,
  tagline = excluded.tagline, description = excluded.description, notes = excluded.notes, sizes = excluded.sizes, look = excluded.look, badge = excluded.badge,
  rank = excluded.rank, inspired = excluded.inspired, inspired_image = excluded.inspired_image, attrs = excluded.attrs, i18n = excluded.i18n;

-- Pradžioje - skyrius „Kaitinami vaškai“ po purškiklių skyriumi (+ EN pavadinimas)
update public.settings set data = jsonb_set(
  jsonb_set(data, '{rails}', (
    select jsonb_agg(x order by ord) from (
      select r as x, (o * 10)::int as ord from jsonb_array_elements(data->'rails') with ordinality as t(r, o)
      union all
      select '{"id":"vaskai","on":true,"line":"Ištirpsta ir ilgai kvepia","mode":"auto","rule":{"sort":"rank","type":"vaskai"},"limit":12,"title":"Kaitinami vaškai"}'::jsonb,
        coalesce((select (o * 10 + 5)::int from jsonb_array_elements(data->'rails') with ordinality as t(r, o) where r->>'id' = 'purskikliai'), 9999)
    ) z)),
  '{i18n,en,rails,vaskai}', '{"title":"Wax melts","line":"Melts and scents your home for longer"}'::jsonb)
where id = 1 and data ? 'rails' and not exists (select 1 from jsonb_array_elements(data->'rails') r where r->>'id' = 'vaskai');
