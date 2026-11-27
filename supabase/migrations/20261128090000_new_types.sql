-- v34: trys naujos prekių kategorijos - namų purškikliai (purskikliai), kaitinami vaškai (vaskai), aromalempos (aromalempos).
-- Purškikliai ir vaškai - su kvapu (scents), aromalempa - prietaisas be kvapo (kaip elektrinis difuzorius).
alter table public.products drop constraint if exists products_type_check;
alter table public.products add constraint products_type_check
  check (type = any (array['kvepalai', 'difuzoriai', 'zvakes', 'aliejai', 'elektriniai-difuzoriai', 'purskikliai', 'vaskai', 'aromalempos']));
