-- Trigerių funkcijų per API kviesti nereikia (trigeriai veikia ir be EXECUTE teisės)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.vd_audit() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
-- is_admin() ir my_confirmed_email() sąmoningai paliekami: jie naudojami RLS politikose ir atskleidžia tik informaciją apie patį kvietėją
comment on function public.is_admin() is 'Ar dabartinis vartotojas – patvirtintas administratorius (admin_emails). Naudojama RLS.';
comment on table public.admin_emails is 'Administratorių el. paštai. Be politikų – matoma tik serveriui (security definer funkcijoms).';
