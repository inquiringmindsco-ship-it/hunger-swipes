-- Test/audit Places remain recoverable for review but cannot appear in discovery
-- or in the community-post Place picker.
update public.places
set status = 'hidden'
where status = 'active'
  and (
    lower(name) like '%test%'
    or lower(name) like '%audit%'
    or lower(name) like '%smoke%'
  );
