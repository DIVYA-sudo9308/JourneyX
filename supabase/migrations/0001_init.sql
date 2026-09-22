-- JourneyX schema (hackathon MVP)
-- Applies to Supabase project ref xmbfocscluhndxyodrwa.
-- Run in Supabase Studio SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- =========================================================================
-- customers
-- =========================================================================
create table if not exists public.customers (
    id                  text primary key,
    display_name        text,
    email               text,
    phone               text,
    loyalty_id          text,
    is_anonymous        boolean not null default false,
    channels            jsonb   not null default '[]'::jsonb,
    event_count         integer not null default 0,
    identity_confidence numeric(4,3) not null default 1.000,
    churn_risk          text    not null default 'none'
                         check (churn_risk in ('none','medium','high')),
    patterns            jsonb   not null default '[]'::jsonb,
    first_seen_at       timestamptz,
    last_active_at      timestamptz,
    metadata            jsonb   not null default '{}'::jsonb,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index if not exists idx_customers_last_active on public.customers(last_active_at desc);
create index if not exists idx_customers_churn_risk  on public.customers(churn_risk);
create index if not exists idx_customers_confidence  on public.customers(identity_confidence);
create index if not exists idx_customers_channels    on public.customers using gin (channels jsonb_path_ops);
create index if not exists idx_customers_patterns    on public.customers using gin (patterns jsonb_path_ops);

-- =========================================================================
-- customer_identifiers
-- =========================================================================
create table if not exists public.customer_identifiers (
    id                  uuid primary key default gen_random_uuid(),
    customer_id         text not null references public.customers(id) on delete cascade,
    identifier_type     text not null
                         check (identifier_type in ('email','phone','loyalty_id','device_id','cookie_id','name')),
    identifier_value    text not null,
    confidence          numeric(4,3) not null default 1.000,
    source              text not null default 'web',
    first_seen_at       timestamptz not null default now(),
    created_at          timestamptz not null default now()
);

create index if not exists idx_identifiers_customer on public.customer_identifiers(customer_id);
create index if not exists idx_identifiers_type_value
    on public.customer_identifiers(identifier_type, identifier_value);

-- =========================================================================
-- journeys
-- =========================================================================
create table if not exists public.journeys (
    id           uuid primary key default gen_random_uuid(),
    customer_id  text not null references public.customers(id) on delete cascade,
    started_at   timestamptz not null,
    ended_at     timestamptz,
    event_count  integer not null default 0,
    created_at   timestamptz not null default now()
);

create index if not exists idx_journeys_customer on public.journeys(customer_id, started_at);

-- =========================================================================
-- events
-- =========================================================================
create table if not exists public.events (
    id           text primary key,
    customer_id  text not null references public.customers(id) on delete cascade,
    event_type   text not null,
    channel      text not null
                  check (channel in ('web','mobile','call_center','email','chat','in_store')),
    "timestamp"  timestamptz not null,
    session_id   text,
    journey_id   uuid references public.journeys(id) on delete set null,
    metadata     jsonb not null default '{}'::jsonb,
    source       text  not null default 'seed',
    created_at   timestamptz not null default now()
);

create index if not exists idx_events_customer_ts on public.events(customer_id, "timestamp");
create index if not exists idx_events_channel     on public.events(channel);
create index if not exists idx_events_type        on public.events(event_type);
create index if not exists idx_events_ts          on public.events("timestamp");
create index if not exists idx_events_journey     on public.events(journey_id);
create index if not exists idx_events_metadata    on public.events using gin (metadata jsonb_path_ops);

-- =========================================================================
-- patterns
-- =========================================================================
create table if not exists public.patterns (
    id           uuid primary key default gen_random_uuid(),
    customer_id  text not null references public.customers(id) on delete cascade,
    pattern_type text not null
                  check (pattern_type in ('drop_off','escalation','repeat_contact','unresolved_issue','churn_signal')),
    confidence   numeric(4,3) not null default 0.900,
    detected_at  timestamptz not null default now(),
    metadata     jsonb not null default '{}'::jsonb,
    created_at   timestamptz not null default now()
);

create index if not exists idx_patterns_customer on public.patterns(customer_id);
create index if not exists idx_patterns_type     on public.patterns(pattern_type);

-- =========================================================================
-- churn_signals
-- =========================================================================
create table if not exists public.churn_signals (
    id           uuid primary key default gen_random_uuid(),
    customer_id  text not null references public.customers(id) on delete cascade,
    signal_type  text not null,
    severity     text not null default 'medium'
                  check (severity in ('low','medium','high')),
    confidence   numeric(4,3) not null default 0.750,
    evidence     text,
    detected_at  timestamptz not null default now(),
    metadata     jsonb not null default '{}'::jsonb,
    created_at   timestamptz not null default now()
);

create index if not exists idx_churn_signals_customer on public.churn_signals(customer_id);
create index if not exists idx_churn_signals_severity on public.churn_signals(severity);

-- =========================================================================
-- identity_links
-- =========================================================================
create table if not exists public.identity_links (
    id            uuid primary key default gen_random_uuid(),
    customer_id   text not null references public.customers(id) on delete cascade,
    identifier_id uuid not null references public.customer_identifiers(id) on delete cascade,
    link_method   text not null default 'deterministic'
                   check (link_method in ('origin','deterministic','probabilistic','conflict')),
    confidence    numeric(4,3) not null default 1.000,
    created_at    timestamptz not null default now()
);

create index if not exists idx_identity_links_customer on public.identity_links(customer_id);
create index if not exists idx_identity_links_ident    on public.identity_links(identifier_id);

-- =========================================================================
-- updated_at triggers
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated
  before update on public.customers
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS: hackathon MVP — anon may read; only service_role may write.
-- No PII is stored beyond synthetic seed data.
-- =========================================================================
alter table public.customers            enable row level security;
alter table public.customer_identifiers enable row level security;
alter table public.events               enable row level security;
alter table public.journeys             enable row level security;
alter table public.patterns             enable row level security;
alter table public.churn_signals        enable row level security;
alter table public.identity_links       enable row level security;

do $policy$
declare
  t text;
begin
  foreach t in array array[
    'customers','customer_identifiers','events','journeys',
    'patterns','churn_signals','identity_links'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_read', t
    );
  end loop;
end
$policy$;
