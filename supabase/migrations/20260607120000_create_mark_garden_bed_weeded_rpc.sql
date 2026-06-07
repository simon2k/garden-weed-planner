create function public.mark_garden_bed_weeded(
  p_bed_id uuid,
  p_weeded_at date,
  p_duration_minutes integer,
  p_note text default null
)
returns table (
  event_id uuid,
  bed_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  owned_bed public.garden_beds%rowtype;
  created_event public.garden_bed_weeding_events%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into owned_bed
  from public.garden_beds
  where id = p_bed_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Garden bed not found' using errcode = 'P0002';
  end if;

  insert into public.garden_bed_weeding_events (
    bed_id,
    user_id,
    weeded_at,
    duration_minutes,
    note
  ) values (
    p_bed_id,
    current_user_id,
    p_weeded_at,
    p_duration_minutes,
    p_note
  )
  returning * into created_event;

  if owned_bed.last_weeded_at is null or owned_bed.last_weeded_at <= p_weeded_at then
    update public.garden_beds
    set last_weeded_at = p_weeded_at,
        weed_level = 'low'
    where id = p_bed_id
      and user_id = current_user_id
    returning * into owned_bed;
  end if;

  return query select created_event.id, owned_bed.id;
end;
$$;

revoke all on function public.mark_garden_bed_weeded(uuid, date, integer, text) from public;
grant execute on function public.mark_garden_bed_weeded(uuid, date, integer, text) to authenticated;
