-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0009 · Aprovisionamiento de perfil al registrarse                          ║
-- ║                                                                            ║
-- ║ Cada alta en auth.users crea automáticamente su fila en public.profiles.   ║
-- ║ La pertenencia a una organización (org_members) se asigna aparte, en el    ║
-- ║ flujo de onboarding/invitación (privilegiado).                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, account_type, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'account_type', 'staff'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
