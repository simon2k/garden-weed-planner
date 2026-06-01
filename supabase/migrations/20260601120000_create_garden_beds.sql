create table public.garden_beds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  area_m2 numeric,
  last_weeded_at date,
  weed_level text not null,
  estimated_minutes integer,
  mulch_depth_cm numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint garden_beds_name_not_empty check (length(btrim(name)) > 0),
  constraint garden_beds_weed_level_check check (weed_level in ('low', 'medium', 'high')),
  constraint garden_beds_area_m2_positive check (area_m2 is null or area_m2 > 0),
  constraint garden_beds_estimated_minutes_positive check (estimated_minutes is null or estimated_minutes > 0),
  constraint garden_beds_mulch_depth_cm_non_negative check (mulch_depth_cm is null or mulch_depth_cm >= 0)
);

create index garden_beds_user_created_at_idx
  on public.garden_beds (user_id, created_at desc);

alter table public.garden_beds enable row level security;

create policy "Users can select their own garden beds"
  on public.garden_beds
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own garden beds"
  on public.garden_beds
  for insert
  to authenticated
  with check (user_id = auth.uid());

create function public.set_garden_beds_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_garden_beds_updated_at
  before update on public.garden_beds
  for each row
  execute function public.set_garden_beds_updated_at();
