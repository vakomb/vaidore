-- v30: parduotuvės tekstuose - tik paprastas brūkšnelis „-“.
-- Jau įrašytuose tekstuose ilgi brūkšniai (U+2012-2015) ir minuso ženklas (U+2212) pakeičiami „-“:
-- prekės, kvapai, kategorijos, kvapų šeimos, nustatymai, natų biblioteka (visi tekstiniai ir JSON stulpeliai,
-- išskyrus raktus). Užsakymai, atsiliepimai ir veiksmų žurnalas nekeičiami (istoriniai įrašai) - parduotuvė ir
-- skydelis juos rodo jau su „-“. Veiksmų žurnale šis sutvarkymas neužrašomas. Galima paleisti kelis kartus.

do $$
declare
  dashes constant text := chr(8210) || chr(8211) || chr(8212) || chr(8213) || chr(8722);
  hyphens constant text := '-----';
  t text;
  c record;
  cast_to text;
begin
  foreach t in array array['products', 'scents', 'categories', 'families', 'settings', 'note_media'] loop
    continue when to_regclass('public.' || t) is null;
    begin
      execute format('alter table public.%I disable trigger user', t);
    exception when insufficient_privilege then null;
    end;
    for c in
      select col.column_name, col.data_type, col.udt_name
      from information_schema.columns col
      where col.table_schema = 'public'
        and col.table_name = t
        and col.is_generated = 'NEVER'
        and (col.data_type in ('text', 'character varying', 'json', 'jsonb') or col.udt_name in ('_text', '_varchar'))
        and not exists (
          select 1
          from information_schema.table_constraints tc
          join information_schema.key_column_usage k
            on k.constraint_name = tc.constraint_name and k.table_schema = tc.table_schema and k.table_name = tc.table_name
          where tc.table_schema = 'public' and tc.table_name = t
            and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
            and k.column_name = col.column_name
        )
    loop
      cast_to := case
        when c.data_type in ('text', 'character varying') then null
        when c.data_type = 'json' then 'json'
        when c.data_type = 'jsonb' then 'jsonb'
        when c.udt_name = '_varchar' then 'varchar[]'
        else 'text[]'
      end;
      if cast_to is null then
        execute format('update public.%I set %I = translate(%I, $1, $2) where %I is distinct from translate(%I, $1, $2)',
          t, c.column_name, c.column_name, c.column_name, c.column_name) using dashes, hyphens;
      else
        execute format('update public.%I set %I = translate(%I::text, $1, $2)::%s where %I::text is distinct from translate(%I::text, $1, $2)',
          t, c.column_name, c.column_name, cast_to, c.column_name, c.column_name) using dashes, hyphens;
      end if;
    end loop;
    begin
      execute format('alter table public.%I enable trigger user', t);
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
