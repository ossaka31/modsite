-- Run this in Supabase SQL Editor to add threaded comment fields
-- This adds: parent_id, user_id, badge_type columns and updates RLS policies

-- Add new columns
alter table public.comments
add column if not exists parent_id uuid references public.comments(id) on delete cascade,
add column if not exists user_id uuid references auth.users(id) on delete set null,
add column if not exists badge_type text check (badge_type in ('osaka', 'anonymous', 'random'));

alter table public.comments alter column published set default true;
alter table public.comments enable row level security;

-- Add indexes for performance
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comments_created_at_idx on public.comments(created_at desc);

-- Drop and recreate insert policy with new fields
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to anon, authenticated
  with check (
    published is true
    and char_length(body) between 2 and 1200
    and char_length(author) <= 40
    and (parent_id is null or exists (
      select 1 from public.comments parent
      where parent.id = comments.parent_id and parent.published
    ))
    and (user_id is null or user_id = auth.uid())
    and (badge_type is null or badge_type in ('osaka', 'anonymous', 'random'))
  );

-- Grant permissions (should already exist but safe to re-run)
grant select, insert on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;
grant update on public.comments to authenticated;

-- Drop and recreate delete/update policies for admins
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (public.is_admin());

drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());