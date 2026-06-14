create policy "Users can delete their own garden beds"
  on public.garden_beds
  for delete
  to authenticated
  using (user_id = auth.uid());
