-- v10: kvapo sudėtis (INCI) – rodoma kvapo puslapyje skiltyje „Ingredientai“ (kaip parfumada.lt), jei užpildyta.
alter table public.products add column if not exists ingredients text not null default '';
