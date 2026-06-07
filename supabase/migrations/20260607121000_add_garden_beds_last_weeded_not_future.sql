alter table public.garden_beds
  add constraint garden_beds_last_weeded_at_not_future
  check (last_weeded_at is null or last_weeded_at <= current_date);
