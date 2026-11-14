-- Užsakymo laiškai išsiųsti (webhook) – kad nesikartotų, net jei užsakymą pirmas įrašė padėkos puslapis
alter table public.orders add column if not exists mailed boolean not null default false;
