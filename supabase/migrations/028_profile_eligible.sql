-- Hunger Swipes — add profile_eligible flag for community posts
alter table public.community_food_posts add column if not exists profile_eligible boolean not null default false;
create index if not exists idx_community_posts_profile_eligible on public.community_food_posts(profile_eligible, moderation_status, status);
