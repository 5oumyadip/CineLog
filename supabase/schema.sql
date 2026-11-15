-- CineLog database schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id bigint not null,
  movie_title text not null,
  poster_path text,
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5),
  body text default '',
  watched_on date default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, movie_id)
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id bigint not null,
  movie_title text not null,
  poster_path text,
  created_at timestamptz not null default now(),
  unique(user_id, movie_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  check(follower_id <> following_id)
);

create table if not exists public.movie_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.movie_list_items (
  list_id uuid not null references public.movie_lists(id) on delete cascade,
  movie_id bigint not null,
  movie_title text not null,
  poster_path text,
  position integer not null default 0,
  primary key(list_id, movie_id)
);

-- Automatically create a profile after signup. Username is based on email prefix;
-- users can change it later in a profile editor.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_name text;
begin
  base_name := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if base_name = '' then base_name := 'cinephile'; end if;
  insert into public.profiles(id, username, display_name)
  values(new.id, base_name || '_' || substr(new.id::text,1,5), base_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.watchlist enable row level security;
alter table public.follows enable row level security;
alter table public.movie_lists enable row level security;
alter table public.movie_list_items enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Reviews are public" on public.reviews for select using (true);
create policy "Users manage own reviews" on public.reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own watchlist" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Follows are public" on public.follows for select using (true);
create policy "Users manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "Public lists or own lists readable" on public.movie_lists for select using (is_public or auth.uid() = user_id);
create policy "Users manage own lists" on public.movie_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "List items visible with parent list" on public.movie_list_items for select using (
  exists(select 1 from public.movie_lists l where l.id = list_id and (l.is_public or l.user_id = auth.uid()))
);
create policy "Users manage items in own lists" on public.movie_list_items for all using (
  exists(select 1 from public.movie_lists l where l.id = list_id and l.user_id = auth.uid())
) with check (
  exists(select 1 from public.movie_lists l where l.id = list_id and l.user_id = auth.uid())
);
