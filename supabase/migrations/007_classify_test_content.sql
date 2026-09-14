-- Keep obvious QA/audit records recoverable while excluding them from production discovery.
update public.dishes
set status = 'removed'
where status = 'active'
  and (
    lower(trim(name)) in ('test','sample','demo')
    or lower(name) like '%audit%'
    or lower(name) like '%smoke test%'
  );

update public.community_food_posts c
set status = 'removed'
from public.places p
where c.place_id = p.id
  and c.source = 'legacy_import'
  and c.status = 'active'
  and (
    lower(p.name) like '%test%'
    or lower(p.name) like '%audit%'
    or lower(p.name) like '%smoke%'
  );
