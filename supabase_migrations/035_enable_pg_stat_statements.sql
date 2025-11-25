-- Enable pg_stat_statements extension to capture query performance metrics
-- Note: This extension requires superuser permissions and may not be available in all Supabase instances
-- The function below will gracefully handle cases where the extension is not available

-- Try to enable the extension (will silently fail if not available)
do $$
begin
  create extension if not exists pg_stat_statements;
exception
  when insufficient_privilege then
    raise notice 'pg_stat_statements extension requires superuser permissions. Skipping.';
  when others then
    raise notice 'Could not enable pg_stat_statements: %', sqlerrm;
end;
$$;

-- Helper function to expose summarized stats without granting direct access to the catalog
-- Falls back to empty results if pg_stat_statements is not available
create or replace function public.get_top_query_stats(limit_count integer default 10)
  returns table(
    query text,
    calls bigint,
    total_time double precision,
    mean_time double precision,
    rows bigint
  )
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Check if pg_stat_statements view exists
  if exists (
    select 1 from pg_views 
    where schemaname = 'public' and viewname = 'pg_stat_statements'
  ) or exists (
    select 1 from pg_extension where extname = 'pg_stat_statements'
  ) then
    -- Extension is available, return real data
    return query
    select
      pss.query,
      pss.calls,
      pss.total_exec_time as total_time,
      pss.mean_exec_time as mean_time,
      pss.rows
    from pg_stat_statements pss
    where pss.userid = (select usesysid from pg_user where usename = current_user limit 1)
    order by pss.mean_exec_time desc
    limit limit_count;
  else
    -- Extension not available, return empty result
    return;
  end if;
end;
$$;

comment on function public.get_top_query_stats is
  'Returns the slowest queries recorded by pg_stat_statements for observability dashboards. Returns empty results if extension is not available.';

