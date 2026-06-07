create table public.garden_bed_weeding_events (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.garden_beds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weeded_at date not null,
  duration_minutes integer not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint garden_bed_weeding_events_weeded_at_not_future check (weeded_at <= current_date),
  constraint garden_bed_weeding_events_duration_minutes_positive check (duration_minutes > 0),
  constraint garden_bed_weeding_events_note_not_empty check (note is null or length(btrim(note)) > 0)
);

create index garden_bed_weeding_events_bed_weeded_at_idx
  on public.garden_bed_weeding_events (bed_id, weeded_at desc, created_at desc);

create index garden_bed_weeding_events_user_bed_idx
  on public.garden_bed_weeding_events (user_id, bed_id);

alter table public.garden_bed_weeding_events enable row level security;

create policy "Users can select their own garden bed weeding events"
  on public.garden_bed_weeding_events
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert weeding events for their own garden beds"
  on public.garden_bed_weeding_events
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.garden_beds
      where garden_beds.id = garden_bed_weeding_events.bed_id
        and garden_beds.user_id = auth.uid()
    )
  );

create policy "Users can update their own garden beds"
  on public.garden_beds
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create function public.set_garden_bed_weeding_events_updated_at()
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

create trigger set_garden_bed_weeding_events_updated_at
  before update on public.garden_bed_weeding_events
  for each row
  execute function public.set_garden_bed_weeding_events_updated_at();
