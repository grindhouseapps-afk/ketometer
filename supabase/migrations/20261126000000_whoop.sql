-- WHOOP OAuth state and tokens. Only the edge functions (service role) touch these tables.
create table if not exists public.whoop_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.whoop_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whoop_user_id bigint,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

alter table public.whoop_oauth_states enable row level security;
alter table public.whoop_tokens enable row level security;
-- No policies: anon/authenticated clients cannot read or write. The service role bypasses RLS.
