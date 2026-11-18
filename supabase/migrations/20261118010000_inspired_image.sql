-- v12: originalo („Įkvėpti …“) nuotrauka – mažas apvalus paveikslėlis pradžios kortelėse (įkelia administratorius).
-- Tuščia – rodoma namų monograma (pvz. „TF“).
alter table public.products add column if not exists inspired_image text not null default '';
