-- Naujienlaiškis (kaip parfumada.lt poraštėje): el. paštas įrašomas iš svetainės (anon), sveikinimo laiškas ir atsisakymas –
-- Edge Function „shop“ (/newsletter: welcome, unsubscribe), siuntimas visiems – administravimo skydelyje (/admin: newsletter-send).
-- Raktas „token“ – atsisakymo nuorodai laiškuose; pirkėjai jo nemato (skaityti gali tik administratorius).
create table if not exists public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  source text not null default '' check (char_length(source) <= 40),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  welcomed_at timestamptz,
  unsubscribed_at timestamptz
);
create unique index if not exists newsletter_email_uq on public.newsletter (lower(email));
create unique index if not exists newsletter_token_uq on public.newsletter (token);

alter table public.newsletter enable row level security;
drop policy if exists "newsletter: bet kas užsiprenumeruoja" on public.newsletter;
create policy "newsletter: bet kas užsiprenumeruoja" on public.newsletter for insert to anon, authenticated
  with check (welcomed_at is null and unsubscribed_at is null);
drop policy if exists "newsletter: admin mato" on public.newsletter;
create policy "newsletter: admin mato" on public.newsletter for select to authenticated using ((select public.is_admin()));
drop policy if exists "newsletter: admin trina" on public.newsletter;
create policy "newsletter: admin trina" on public.newsletter for delete to authenticated using ((select public.is_admin()));
-- Pirkėjas gali įrašyti tik el. paštą ir šaltinį (raktą, datas nustato bazė)
revoke insert on public.newsletter from anon, authenticated;
grant insert (email, source) on public.newsletter to anon, authenticated;
grant select, delete on public.newsletter to authenticated;
