-- v7: kiekvienas Vaidore kvapas – viena nuotrauka, buteliukas permatomame fone (img/kvapai/<id>-1.webp).
-- Scenos su fonu (img/kvapai/<id>-2.webp) pašalintos iš repozitorijos, todėl išimamos ir iš kvapų nuotraukų sąrašo.
update public.products
set images = array(select x from unnest(images) as x where x !~ '^img/kvapai/[a-z0-9-]+-2\.webp$')
where exists (select 1 from unnest(images) as x where x ~ '^img/kvapai/[a-z0-9-]+-2\.webp$');
-- Kvapai, kuriems liko tik scena su fonu (buvo pašalinta buteliuko nuotrauka), gauna buteliuką be fono
update public.products
set images = array['img/kvapai/' || id || '-1.webp']
where cardinality(images) = 0
  and id in ('vanor', 'safrane', 'arven', 'noirelle', 'bellara', 'ventor', 'lavelle', 'aurum', 'azurin', 'vialune');
