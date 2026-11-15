begin;

create schema if not exists geozity_private;
revoke all on schema geozity_private from public, anon, authenticated;

create table geozity_private.daily_usage (
  usage_day date not null,
  meter text not null check (meter in ('map', 'ai', 'voice_seconds', 'speech_characters', 'requests')),
  client_hash text not null,
  units bigint not null check (units >= 0),
  primary key (usage_day, meter, client_hash)
);
alter table geozity_private.daily_usage enable row level security;
revoke all on geozity_private.daily_usage from public, anon, authenticated;

-- Serialized reservations protect both the shared and daily pseudonymous client caps.
-- Only aggregate totals and rotating hashes are stored; never queries, IPs, or locations.
create function public.geozity_reserve_usage(
  p_meter text, p_units integer, p_global_limit integer,
  p_client_limit integer, p_client_hash text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  today date := (pg_catalog.clock_timestamp() at time zone 'UTC')::date;
  global_units bigint;
  client_units bigint;
begin
  if p_meter not in ('map', 'ai', 'voice_seconds', 'speech_characters', 'requests')
     or p_units is null or p_units < 1 or p_units > 10000
     or p_global_limit is null or p_global_limit < 1 or p_global_limit > 10000
     or p_client_limit is null or p_client_limit < 1 or p_client_limit > p_global_limit
     or p_client_hash is null or p_client_hash !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Invalid usage reservation';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_meter || today::text, 0));
  select coalesce(sum(units), 0) into global_units from geozity_private.daily_usage where usage_day = today and meter = p_meter;
  select coalesce(max(units), 0) into client_units from geozity_private.daily_usage where usage_day = today and meter = p_meter and client_hash = p_client_hash;
  if global_units + p_units > p_global_limit or client_units + p_units > p_client_limit then return false; end if;
  insert into geozity_private.daily_usage values (today, p_meter, p_client_hash, p_units)
  on conflict (usage_day, meter, client_hash) do update set units = geozity_private.daily_usage.units + excluded.units;
  -- Keep the last seven days of operational counts, not an indefinite history.
  delete from geozity_private.daily_usage where usage_day < today - 7;
  return true;
end;
$$;
revoke all on function public.geozity_reserve_usage(text, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.geozity_reserve_usage(text, integer, integer, integer, text) to service_role;
commit;
