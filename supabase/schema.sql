-- OSAKA mod sitesi
-- Supabase SQL Editor'da tek seferde çalıştır.
-- Servis anahtarını siteye koyma. Uygulama yalnızca anon anahtarını kullanır.
-- Kayıt olduktan sonra kendine yetki vermek için, en alttaki UPDATE satırındaki
-- e-postayı kendi adresinle değiştirip o satırı ayrıca çalıştır.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_document (
  id smallint primary key default 1 check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- Girişsiz yorumlar. author boş kalırsa anonim sayılır.
-- parent_id: yanıtlanılan yorumun ID'si (iç içe yorumlar için)
-- user_id: giriş yapan kullanıcının ID'si (varsa)
-- badge_type: admin rozeti türü ('osaka' | 'anonymous' | 'random' | null)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.comments(id) on delete cascade,
  author text not null default '',
  body text not null,
  published boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  badge_type text check (badge_type in ('osaka', 'anonymous', 'random')),
  created_at timestamptz not null default now()
);

create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comments_created_at_idx on public.comments(created_at desc);

insert into public.site_document (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') is distinct from 'service_role'
       and current_user not in ('postgres', 'supabase_admin', 'supabase_auth_admin') then
      raise exception 'role is locked';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_lock on public.profiles;
create trigger profiles_role_lock
  before update on public.profiles
  for each row execute function public.protect_profile_role();

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.site_document from public, anon, authenticated;
revoke all on public.gallery_images from public, anon, authenticated;
revoke all on public.audit_events from public, anon, authenticated;
revoke all on public.comments from public, anon, authenticated;

grant select on public.profiles to authenticated;

-- RLS politikaları public.is_admin() fonksiyonunu çağırır. Yeni Supabase
-- projeleri fonksiyonlara PUBLIC EXECUTE vermediği için bu yetki açıkça verilmeli.
-- Verilmezse policy'li tablolar "permission denied for function is_admin" (42501) döner.
grant execute on function public.is_admin() to authenticated;

grant select on public.site_document to anon, authenticated;
grant insert, update on public.site_document to authenticated;
grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_images to authenticated;
grant select, insert on public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;
grant select, insert on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;
grant update on public.comments to authenticated;

alter table public.profiles enable row level security;
alter table public.site_document enable row level security;
alter table public.gallery_images enable row level security;
alter table public.audit_events enable row level security;
alter table public.comments enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists site_read on public.site_document;
create policy site_read on public.site_document
  for select to anon, authenticated
  using (true);

drop policy if exists site_insert on public.site_document;
create policy site_insert on public.site_document
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists site_update on public.site_document;
create policy site_update on public.site_document
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists gallery_read on public.gallery_images;
create policy gallery_read on public.gallery_images
  for select to anon, authenticated
  using (true);

drop policy if exists gallery_write on public.gallery_images;
create policy gallery_write on public.gallery_images
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists gallery_update on public.gallery_images;
create policy gallery_update on public.gallery_images
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists gallery_delete on public.gallery_images;
create policy gallery_delete on public.gallery_images
  for delete to authenticated
  using (public.is_admin());

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists audit_insert on public.audit_events;
create policy audit_insert on public.audit_events
  for insert to authenticated
  with check (public.is_admin() and actor = auth.uid());

-- Yorumlar herkese açık okunur. Girişsiz ziyaretçi de yazabilir; sınırlar
-- veritabanında da tutulur, böylece doğrudan API çağrısı aynı kurallara uyar.
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
  for select to anon, authenticated
  using (published);

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to anon, authenticated
  with check (
    published
    and char_length(body) between 2 and 1200
    and char_length(author) <= 40
    and (parent_id is null or exists (select 1 from public.comments c where c.id = parent_id and c.published))
    and (user_id is null or user_id = auth.uid())
    and (badge_type is null or badge_type in ('osaka', 'anonymous', 'random'))
  );

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (public.is_admin());

drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 4194304,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- Kayıt olduktan sonra bu satırı kendi e-postanla çalıştır:
-- update public.profiles set role = 'admin' where lower(email) = lower('senin-epostan@ornek.com');
