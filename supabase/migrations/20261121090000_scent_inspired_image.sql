-- v18: originalo („Įkvėpti …“) nuotrauka – bendrame kvape (scents) ir produktuose (products.inspired_image jau yra – 20261118010000).
-- Parduotuvėje rodoma originalo blokelyje (kortelėje vietoj natų ir produkto puslapyje). Įkeliama administravime: Kvapai → kvapas.
alter table public.products add column if not exists inspired_image text not null default '';
alter table public.scents add column if not exists inspired_image text not null default '' check (char_length(inspired_image) <= 500);

-- Jei produktuose jau buvo įkeltų originalo nuotraukų (v12) – perkeliama į jų kvapą, kad niekas nedingtų
update public.scents s
set inspired_image = p.inspired_image
from (
  select distinct on (scent_id) scent_id, inspired_image
  from public.products
  where scent_id is not null and inspired_image <> ''
  order by scent_id, updated_at desc
) p
where p.scent_id = s.id and s.inspired_image = '';

-- Kvape yra, produkte – ne: pritaikoma susietiems produktams
update public.products p
set inspired_image = s.inspired_image
from public.scents s
where p.scent_id = s.id and p.inspired_image = '' and s.inspired_image <> '';
