create table public.garden_bed_plants (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.garden_beds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  planted_year integer,
  quantity integer,
  height_cm numeric,
  width_cm numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint garden_bed_plants_name_not_empty check (length(btrim(name)) > 0),
  constraint garden_bed_plants_planted_year_range check (
    planted_year is null
    or (planted_year between 1900 and extract(year from current_date)::integer)
  ),
  constraint garden_bed_plants_quantity_positive check (quantity is null or quantity > 0),
  constraint garden_bed_plants_height_cm_positive check (height_cm is null or height_cm > 0),
  constraint garden_bed_plants_width_cm_positive check (width_cm is null or width_cm > 0)
);

create index garden_bed_plants_bed_created_at_idx
  on public.garden_bed_plants (bed_id, created_at desc);

create index garden_bed_plants_user_bed_idx
  on public.garden_bed_plants (user_id, bed_id);

alter table public.garden_bed_plants enable row level security;

create policy "Users can select their own garden bed plants"
  on public.garden_bed_plants
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert plants for their own garden beds"
  on public.garden_bed_plants
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.garden_beds
      where garden_beds.id = garden_bed_plants.bed_id
        and garden_beds.user_id = auth.uid()
    )
  );

create function public.set_garden_bed_plants_updated_at()
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

create trigger set_garden_bed_plants_updated_at
  before update on public.garden_bed_plants
  for each row
  execute function public.set_garden_bed_plants_updated_at();
