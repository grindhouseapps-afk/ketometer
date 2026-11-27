-- WHOOP OAuth links, keyed by an anonymous device id. Only edge functions (service role) can read/write.
create table if not exists public.whoop_links (
  device_id uuid primary key,
  secret_hash text not null,
  oauth_state text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  whoop_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whoop_links enable row level security;
-- No policies: anon/authenticated clients have no access.
-- Newer Supabase projects don't grant table privileges to service_role automatically.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.whoop_links to service_role;
