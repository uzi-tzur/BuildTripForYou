-- BuildTripForYou — initial schema (Phase 2: Authentication + Database)
-- Mirrors src/lib/types/*.ts. Run against a Supabase Postgres project
-- (SQL Editor, or `supabase db push` if you use the Supabase CLI).

-- ---------------------------------------------------------------------
-- profiles: one row per auth.users row, created automatically on signup
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  traveler_type text not null check (traveler_type in ('solo', 'couple', 'family', 'road-trip', 'group')),
  interests text[] not null default '{}',
  budget_level text check (budget_level in ('low', 'medium', 'high')),
  pace text not null check (pace in ('relaxed', 'moderate', 'packed')),
  outdoor_indoor_balance text not null check (outdoor_indoor_balance in ('outdoor', 'indoor', 'balanced')),
  food_preferences text[] not null default '{}',
  accommodation_preferences text[] not null default '{}'
);

alter table user_preferences enable row level security;
create policy "user_preferences_owner" on user_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  origin text not null,
  destination text not null,
  travelers int not null default 1,
  transportation_mode text not null check (transportation_mode in ('driving', 'flying', 'walking', 'transit', 'mixed')),
  budget numeric,
  status text not null default 'draft' check (status in ('draft', 'planned', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trips enable row level security;
create policy "trips_owner" on trips for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- destinations (shared reference data — readable by any authenticated user)
-- ---------------------------------------------------------------------
create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'attraction',
  address text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  phone text,
  website text,
  image_url text,
  rating numeric,
  price numeric,
  opening_hours text,
  reservation_required boolean not null default false,
  recommended_duration_minutes int,
  booking_url text,
  best_time_to_visit text,
  source text not null default 'mock',
  last_verified_at timestamptz
);

alter table destinations enable row level security;
create policy "destinations_read_all" on destinations for select using (auth.role() = 'authenticated');
create policy "destinations_insert_authenticated" on destinations for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- trip_days
-- ---------------------------------------------------------------------
create table if not exists trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  date date not null,
  day_number int not null,
  summary text
);

alter table trip_days enable row level security;
create policy "trip_days_owner" on trip_days for all
  using (exists (select 1 from trips where trips.id = trip_days.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = trip_days.trip_id and trips.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  destination_id uuid references destinations(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes int not null,
  activity_type text not null check (activity_type in ('travel', 'meal', 'attraction', 'lodging', 'free_time', 'other')),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped', 'cancelled')),
  reservation_required boolean not null default false,
  reservation_status text check (reservation_status in ('not_required', 'pending', 'confirmed')),
  notes text,
  sequence int not null default 0
);

alter table activities enable row level security;
create policy "activities_owner" on activities for all
  using (exists (
    select 1 from trip_days join trips on trips.id = trip_days.trip_id
    where trip_days.id = activities.trip_day_id and trips.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from trip_days join trips on trips.id = trip_days.trip_id
    where trip_days.id = activities.trip_day_id and trips.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- routes (cached route calculations)
-- ---------------------------------------------------------------------
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  origin text not null,
  destination text not null,
  distance_meters numeric not null,
  estimated_duration_seconds int not null,
  traffic_duration_seconds int,
  departure_time timestamptz,
  arrival_time timestamptz,
  provider text not null,
  travel_mode text not null,
  route_data jsonb,
  calculated_at timestamptz not null default now()
);

alter table routes enable row level security;
create policy "routes_owner" on routes for all
  using (trip_id is null or exists (select 1 from trips where trips.id = routes.trip_id and trips.user_id = auth.uid()))
  with check (trip_id is null or exists (select 1 from trips where trips.id = routes.trip_id and trips.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- weather_alerts
-- ---------------------------------------------------------------------
create table if not exists weather_alerts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  activity_id uuid references activities(id),
  alert_type text not null,
  severity text not null check (severity in ('low', 'moderate', 'high', 'severe')),
  message text not null,
  detected_at timestamptz not null default now(),
  recommended_action text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed'))
);

alter table weather_alerts enable row level security;
create policy "weather_alerts_owner" on weather_alerts for all
  using (exists (select 1 from trips where trips.id = weather_alerts.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = weather_alerts.trip_id and trips.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  activity_id uuid references activities(id),
  title text not null,
  reasons text[] not null default '{}',
  impact_summary text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  payload jsonb
);

alter table recommendations enable row level security;
create policy "recommendations_owner" on recommendations for all
  using (exists (select 1 from trips where trips.id = recommendations.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = recommendations.trip_id and trips.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  category text not null check (category in ('weather', 'traffic', 'schedule', 'opportunity', 'system')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table notifications enable row level security;
create policy "notifications_owner" on notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  provider text not null default 'none',
  status text not null default 'not_required' check (status in ('not_required', 'pending', 'confirmed', 'cancelled')),
  confirmation_code text,
  booking_url text
);

alter table bookings enable row level security;
create policy "bookings_owner" on bookings for all
  using (exists (select 1 from trips where trips.id = bookings.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = bookings.trip_id and trips.user_id = auth.uid()));
