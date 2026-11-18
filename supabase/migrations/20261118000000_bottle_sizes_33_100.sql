-- Buteliukų talpos – tik 33 ml ir 100 ml (+ 2 ml mėginukas, laukas sample).
-- 30 ml → 33 ml (kaina ir sena kaina lieka), 50 ml ir kitos talpos pašalinamos. Kartojant – nieko nekeičia.
update public.products p
set sizes = coalesce(
  (
    select jsonb_agg(
      case when (s->>'ml')::int = 30 then jsonb_set(s, '{ml}', '33'::jsonb) else s end
      order by (s->>'ml')::int
    )
    from jsonb_array_elements(p.sizes) s
    where (s->>'ml')::int in (30, 33, 100)
  ),
  '[]'::jsonb
)
where exists (select 1 from jsonb_array_elements(p.sizes) s where (s->>'ml')::int not in (33, 100));
