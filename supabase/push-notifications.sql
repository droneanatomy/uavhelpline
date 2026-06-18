-- Push notifications: device token registry.
-- Run this in Supabase → SQL Editor after schema.sql.

create table if not exists push_tokens (
  token text primary key,
  platform text,
  created_at timestamptz default now()
);

alter table push_tokens enable row level security;

-- Devices (anonymous app users) may register and refresh their own token.
-- No SELECT policy is granted, so tokens stay private; the Edge Function reads
-- them with the service-role key, which bypasses RLS.
drop policy if exists "anyone can register token" on push_tokens;
create policy "anyone can register token"
  on push_tokens for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anyone can refresh token" on push_tokens;
create policy "anyone can refresh token"
  on push_tokens for update
  to anon, authenticated
  using (true) with check (true);
