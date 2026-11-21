-- v30b: visų kvapų natos - viršutinės, širdies ir bazinės - pilnos ir teisingos, pagal originalo kvapą.
--  • Natos sutvarkytos (be lenkiškų žodžių, būdvardžių ir „Aromatų šeima: …“), trūkstamos papildytos iš originalo
--    (Fragrantica / gamintojo piramidės); CREEDORE ir SAUVADORE - pagal Creed Aventus ir Dior Sauvage.
--  • LIBRADORE - Yves Saint Laurent Libre (buvo klaidingai „Carolina Herrera - Good Girl“): originalas, natos, šūkis.
--  • Aprašymuose pakeistas tik natų sakinys („Viršutinės natos - …“ / „Pradžioje - …“); kiti tekstai nekeičiami.
--  • Šūkiai: SAUVADORE „aromatyczna lawenda“ -> „levanda“, TOBADORE „tonka pupelės“ -> „tonkos pupelės“.
--  • BACADORE natos jau teisingos (nekeičiamos); aprašyme pataisytas pavadinimas „BACCADORE“ -> „BACADORE“.
-- Natų nuotraukos - parduotuvėje (img/natos/, src/data/notes.json), duomenų bazėje nieko įkelti nereikia.
-- Galima paleisti kelis kartus. Veiksmų žurnale šis sutvarkymas neužrašomas.

do $$
declare
  t text;
begin
  foreach t in array array['products', 'scents'] loop
    begin
      execute format('alter table public.%I disable trigger user', t);
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- CODORE
update public.products set notes = '{"top": ["Imbieras", "Citrina", "Mandarinas"], "heart": ["Mėta"], "base": ["Gintaras", "Vetiveris"]}'::jsonb where scent_id = 'codore';
update public.scents set notes = '{"top": ["Imbieras", "Citrina", "Mandarinas"], "heart": ["Mėta"], "base": ["Gintaras", "Vetiveris"]}'::jsonb where id = 'codore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - imbieras, citrina ir mandarinas, širdies - mėta, bazinės - gintaras ir vetiveris.') where scent_id = 'codore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - imbieras, citrina ir mandarinas, širdyje - mėta, o bazėje - gintaras ir vetiveris.') where scent_id = 'codore';

-- CREEDORE
update public.products set notes = '{"top": ["Bergamotė", "Juodieji serbentai", "Obuolys", "Citrina", "Rožiniai pipirai"], "heart": ["Ananasas", "Pačiulis", "Jazminas"], "base": ["Beržas", "Muskusas", "Ąžuolo samanos", "Kedras", "Ambroksanas"]}'::jsonb where scent_id = 'creedore';
update public.scents set notes = '{"top": ["Bergamotė", "Juodieji serbentai", "Obuolys", "Citrina", "Rožiniai pipirai"], "heart": ["Ananasas", "Pačiulis", "Jazminas"], "base": ["Beržas", "Muskusas", "Ąžuolo samanos", "Kedras", "Ambroksanas"]}'::jsonb where id = 'creedore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - bergamotė, juodieji serbentai, obuolys, citrina ir rožiniai pipirai, širdies - ananasas, pačiulis ir jazminas, bazinės - beržas, muskusas, ąžuolo samanos, kedras ir ambroksanas.') where scent_id = 'creedore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - bergamotė, juodieji serbentai, obuolys, citrina ir rožiniai pipirai, širdyje - ananasas, pačiulis ir jazminas, o bazėje - beržas, muskusas, ąžuolo samanos, kedras ir ambroksanas.') where scent_id = 'creedore';

-- INVIDORE
update public.products set notes = '{"top": ["Greipfrutas", "Jūros natos", "Mandarinas"], "heart": ["Lauro lapai", "Jazminas"], "base": ["Pilkasis ambra", "Gvajako mediena", "Ąžuolo samanos", "Pačiulis"]}'::jsonb where scent_id = 'invidore';
update public.scents set notes = '{"top": ["Greipfrutas", "Jūros natos", "Mandarinas"], "heart": ["Lauro lapai", "Jazminas"], "base": ["Pilkasis ambra", "Gvajako mediena", "Ąžuolo samanos", "Pačiulis"]}'::jsonb where id = 'invidore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - greipfrutas, jūros natos ir mandarinas, širdies - lauro lapai ir jazminas, bazinės - pilkasis ambra, gvajako mediena, ąžuolo samanos ir pačiulis.') where scent_id = 'invidore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - greipfrutas, jūros natos ir mandarinas, širdyje - lauro lapai ir jazminas, o bazėje - pilkasis ambra, gvajako mediena, ąžuolo samanos ir pačiulis.') where scent_id = 'invidore';

-- LIBRADORE
update public.products set notes = '{"top": ["Mandarinas", "Petitgrenas", "Lavandinas", "Juodieji serbentai"], "heart": ["Levanda", "Jazminas", "Apelsinmedžio žiedai"], "base": ["Vanilė", "Kedras", "Pilkasis ambra", "Muskusas"]}'::jsonb where scent_id = 'libradore';
update public.scents set notes = '{"top": ["Mandarinas", "Petitgrenas", "Lavandinas", "Juodieji serbentai"], "heart": ["Levanda", "Jazminas", "Apelsinmedžio žiedai"], "base": ["Vanilė", "Kedras", "Pilkasis ambra", "Muskusas"]}'::jsonb where id = 'libradore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - mandarinas, petitgrenas, lavandinas ir juodieji serbentai, širdies - levanda, jazminas ir apelsinmedžio žiedai, bazinės - vanilė, kedras, pilkasis ambra ir muskusas.') where scent_id = 'libradore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - mandarinas, petitgrenas, lavandinas ir juodieji serbentai, širdyje - levanda, jazminas ir apelsinmedžio žiedai, o bazėje - vanilė, kedras, pilkasis ambra ir muskusas.') where scent_id = 'libradore';

-- MILLIDORE
update public.products set notes = '{"top": ["Raudonasis mandarinas", "Greipfrutas", "Mėta"], "heart": ["Rožė", "Cinamonas", "Prieskoniai"], "base": ["Oda", "Gintaras", "Medienos natos", "Pačiulis"]}'::jsonb where scent_id = 'millidore';
update public.scents set notes = '{"top": ["Raudonasis mandarinas", "Greipfrutas", "Mėta"], "heart": ["Rožė", "Cinamonas", "Prieskoniai"], "base": ["Oda", "Gintaras", "Medienos natos", "Pačiulis"]}'::jsonb where id = 'millidore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - raudonasis mandarinas, greipfrutas ir mėta, širdies - rožė, cinamonas ir prieskoniai, bazinės - oda, gintaras, medienos natos ir pačiulis.') where scent_id = 'millidore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - raudonasis mandarinas, greipfrutas ir mėta, širdyje - rožė, cinamonas ir prieskoniai, o bazėje - oda, gintaras, medienos natos ir pačiulis.') where scent_id = 'millidore';

-- SAUVADORE
update public.products set notes = '{"top": ["Bergamotė", "Pipirai"], "heart": ["Sičuano pipirai", "Levanda", "Rožiniai pipirai", "Vetiveris", "Pačiulis", "Pelargonija", "Elemi"], "base": ["Ambroksanas", "Kedras", "Labdanas"]}'::jsonb where scent_id = 'sauvadore';
update public.scents set notes = '{"top": ["Bergamotė", "Pipirai"], "heart": ["Sičuano pipirai", "Levanda", "Rožiniai pipirai", "Vetiveris", "Pačiulis", "Pelargonija", "Elemi"], "base": ["Ambroksanas", "Kedras", "Labdanas"]}'::jsonb where id = 'sauvadore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - bergamotė ir pipirai, širdies - Sičuano pipirai, levanda, rožiniai pipirai, vetiveris, pačiulis, pelargonija ir elemi, bazinės - ambroksanas, kedras ir labdanas.') where scent_id = 'sauvadore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - bergamotė ir pipirai, širdyje - Sičuano pipirai, levanda, rožiniai pipirai, vetiveris, pačiulis, pelargonija ir elemi, o bazėje - ambroksanas, kedras ir labdanas.') where scent_id = 'sauvadore';

-- SIRED
update public.products set notes = '{"top": ["Kriaušė", "Juodieji serbentai", "Rožiniai pipirai", "Greipfrutas"], "heart": ["Rožė", "Jazminas", "Heliotropas", "Ananasas"], "base": ["Vanilė", "Kedras", "Pačiulis", "Gintaro mediena"]}'::jsonb where scent_id = 'sired';
update public.scents set notes = '{"top": ["Kriaušė", "Juodieji serbentai", "Rožiniai pipirai", "Greipfrutas"], "heart": ["Rožė", "Jazminas", "Heliotropas", "Ananasas"], "base": ["Vanilė", "Kedras", "Pačiulis", "Gintaro mediena"]}'::jsonb where id = 'sired';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - kriaušė, juodieji serbentai, rožiniai pipirai ir greipfrutas, širdies - rožė, jazminas, heliotropas ir ananasas, bazinės - vanilė, kedras, pačiulis ir gintaro mediena.') where scent_id = 'sired';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - kriaušė, juodieji serbentai, rožiniai pipirai ir greipfrutas, širdyje - rožė, jazminas, heliotropas ir ananasas, o bazėje - vanilė, kedras, pačiulis ir gintaro mediena.') where scent_id = 'sired';

-- TOBADORE
update public.products set notes = '{"top": ["Tabako lapai", "Prieskoniai"], "heart": ["Tonkos pupelės", "Tabako žiedai", "Vanilė", "Kakava"], "base": ["Džiovinti vaisiai", "Medienos natos"]}'::jsonb where scent_id = 'tobadore';
update public.scents set notes = '{"top": ["Tabako lapai", "Prieskoniai"], "heart": ["Tonkos pupelės", "Tabako žiedai", "Vanilė", "Kakava"], "base": ["Džiovinti vaisiai", "Medienos natos"]}'::jsonb where id = 'tobadore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - tabako lapai ir prieskoniai, širdies - tonkos pupelės, tabako žiedai, vanilė ir kakava, bazinės - džiovinti vaisiai ir medienos natos.') where scent_id = 'tobadore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - tabako lapai ir prieskoniai, širdyje - tonkos pupelės, tabako žiedai, vanilė ir kakava, o bazėje - džiovinti vaisiai ir medienos natos.') where scent_id = 'tobadore';

-- VANIDORE
update public.products set notes = '{"top": ["Kardamonas", "Mandarinas", "Šafranas"], "heart": ["Vanilė", "Prieskoniai", "Gėlių natos"], "base": ["Santalas", "Gintaras", "Tonkos pupelės"]}'::jsonb where scent_id = 'vanidore';
update public.scents set notes = '{"top": ["Kardamonas", "Mandarinas", "Šafranas"], "heart": ["Vanilė", "Prieskoniai", "Gėlių natos"], "base": ["Santalas", "Gintaras", "Tonkos pupelės"]}'::jsonb where id = 'vanidore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - kardamonas, mandarinas ir šafranas, širdies - vanilė, prieskoniai ir gėlių natos, bazinės - santalas, gintaras ir tonkos pupelės.') where scent_id = 'vanidore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - kardamonas, mandarinas ir šafranas, širdyje - vanilė, prieskoniai ir gėlių natos, o bazėje - santalas, gintaras ir tonkos pupelės.') where scent_id = 'vanidore';

-- WAYDORE
update public.products set notes = '{"top": ["Bergamotė", "Apelsinmedžio žiedai"], "heart": ["Tuberozė", "Jazminas"], "base": ["Vanilė", "Baltasis muskusas", "Kedras"]}'::jsonb where scent_id = 'waydore';
update public.scents set notes = '{"top": ["Bergamotė", "Apelsinmedžio žiedai"], "heart": ["Tuberozė", "Jazminas"], "base": ["Vanilė", "Baltasis muskusas", "Kedras"]}'::jsonb where id = 'waydore';
update public.products set description = regexp_replace(description, 'Viršutinės natos ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Viršutinės natos - bergamotė ir apelsinmedžio žiedai, širdies - tuberozė ir jazminas, bazinės - vanilė, baltasis muskusas ir kedras.') where scent_id = 'waydore';
update public.products set description = regexp_replace(description, 'Pradžioje ' || '[-' || chr(8211) || ']' || ' [^.]*\.', 'Pradžioje - bergamotė ir apelsinmedžio žiedai, širdyje - tuberozė ir jazminas, o bazėje - vanilė, baltasis muskusas ir kedras.') where scent_id = 'waydore';

-- LIBRADORE - Yves Saint Laurent Libre
update public.products set inspired = 'Yves Saint Laurent - Libre', tagline = 'Levanda, apelsinmedžio žiedai ir vanilė' where scent_id = 'libradore';
update public.scents set inspired = 'Yves Saint Laurent - Libre' where id = 'libradore';

-- Šūkiai ir aprašymo pavadinimas
update public.products set tagline = replace(tagline, 'aromatyczna lawenda', 'levanda') where scent_id = 'sauvadore' and tagline like '%aromatyczna lawenda%';
update public.products set tagline = replace(tagline, 'tonka pupelės', 'tonkos pupelės') where scent_id = 'tobadore' and tagline like '%tonka pupelės%';
update public.products set description = replace(description, 'BACCADORE', 'BACADORE') where id = 'bacadore' and description like '%BACCADORE%';

do $$
declare
  t text;
begin
  foreach t in array array['products', 'scents'] loop
    begin
      execute format('alter table public.%I enable trigger user', t);
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
