create table public.garden_bed_weed_observations (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.garden_beds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  observed_at date not null,
  weed_catalog_slug text,
  weed_name text,
  weed_category text not null,
  growth_stage text not null,
  coverage text not null,
  severity integer not null,
  spreads_by_rhizomes boolean not null default false,
  spreads_by_stolons boolean not null default false,
  spreads_by_tubers boolean not null default false,
  regrows_from_root_fragments boolean not null default false,
  prolific_seed_producer boolean not null default false,
  fast_regrowth boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint garden_bed_weed_observations_observed_at_not_future check (observed_at <= current_date),
  constraint garden_bed_weed_observations_catalog_slug_not_empty check (
    weed_catalog_slug is null or length(btrim(weed_catalog_slug)) > 0
  ),
  constraint garden_bed_weed_observations_weed_name_not_empty check (
    weed_name is null or length(btrim(weed_name)) > 0
  ),
  constraint garden_bed_weed_observations_weed_category_allowed check (
    weed_category in ('annual_seed', 'creeping_perennial', 'tuber_or_bulb', 'deep_root_perennial', 'unknown')
  ),
  constraint garden_bed_weed_observations_growth_stage_allowed check (
    growth_stage in ('seedling', 'vegetative', 'flowering', 'seeding')
  ),
  constraint garden_bed_weed_observations_coverage_allowed check (
    coverage in ('low', 'medium', 'high')
  ),
  constraint garden_bed_weed_observations_severity_range check (severity between 1 and 5),
  constraint garden_bed_weed_observations_note_not_empty check (
    note is null or length(btrim(note)) > 0
  )
);

create index garden_bed_weed_observations_bed_observed_at_idx
  on public.garden_bed_weed_observations (bed_id, observed_at desc);

create index garden_bed_weed_observations_user_bed_idx
  on public.garden_bed_weed_observations (user_id, bed_id);

alter table public.garden_bed_weed_observations enable row level security;

create policy "Users can select their own garden bed weed observations"
  on public.garden_bed_weed_observations
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert weed observations for their own garden beds"
  on public.garden_bed_weed_observations
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.garden_beds
      where garden_beds.id = garden_bed_weed_observations.bed_id
        and garden_beds.user_id = auth.uid()
    )
  );

create function public.set_garden_bed_weed_observations_updated_at()
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

create trigger set_garden_bed_weed_observations_updated_at
  before update on public.garden_bed_weed_observations
  for each row
  execute function public.set_garden_bed_weed_observations_updated_at();
