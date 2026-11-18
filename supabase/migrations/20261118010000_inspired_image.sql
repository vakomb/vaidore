-- v12: originalo („Įkvėpti …“) nuotrauka. Šiuo metu parduotuvėje nerodoma (blokas atšauktas savininko prašymu),
-- stulpelis ir įkelti duomenys palikti, kad nedingtų.
alter table public.products add column if not exists inspired_image text not null default '';
