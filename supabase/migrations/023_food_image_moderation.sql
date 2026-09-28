-- Hunger Swipes — Food Image Moderation Gate
-- Adds moderation state to community food posts and supporting tables for
-- automated checks, duplicate detection, review decisions, and deletion audit.

-- 1. Moderation state on community food posts.
-- 'pending_review' = uploaded, not yet approved for Discover or Swipe Bucks.
-- 'approved'       = passed gate, Discover + Swipe Bucks eligible.
-- 'rejected'       = failed gate, not Discover eligible, not reward eligible.
-- 'removed'        = was approved but later deleted/removed by user or admin.
alter table public.community_food_posts
  add column if not exists moderation_status text not null default 'pending_review'
    check (moderation_status in ('pending_review','approved','rejected','removed')),
  add column if not exists moderation_reason text,
  add column if not exists moderation_confidence numeric(4,3) check (moderation_confidence between 0 and 1),
  add column if not exists moderation_service text,
  add column if not exists moderation_assessment jsonb,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists image_hash text,
  add column if not exists perceptual_hash text,
  add column if not exists duplicate_of uuid references public.community_food_posts(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deletion_reason text check (deletion_reason in (
    'not_food','inappropriate','duplicate','wrong_dish','wrong_restaurant',
    'poor_misleading','user_request','other','admin_removal','user_delete'
  )),
  add column if not exists first_photo_rewarded boolean not null default false,
  add column if not exists first_photo_reward_processed_at timestamptz;

-- Existing seller/trusted content uses source='legacy_import' and should remain approved.
-- User-uploaded community content starts as pending_review.
update public.community_food_posts
  set moderation_status = 'approved'
  where source = 'legacy_import' and moderation_status = 'pending_review';

-- Indexes for review UI and feed queries.
create index if not exists idx_community_posts_moderation on public.community_food_posts(moderation_status, created_at desc);
create index if not exists idx_community_posts_image_hash on public.community_food_posts(image_hash);
create index if not exists idx_community_posts_perceptual_hash on public.community_food_posts(perceptual_hash);
create index if not exists idx_community_posts_review on public.community_food_posts(moderation_status, moderated_at, created_at desc);

-- 2. Duplicate/reupload detection log.
create table if not exists public.image_fingerprints (
  id uuid primary key default gen_random_uuid(),
  community_post_id uuid references public.community_food_posts(id) on delete cascade,
  image_hash text not null,
  perceptual_hash text,
  file_size_bytes integer,
  width integer,
  height integer,
  rejected boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_image_fingerprints_hash on public.image_fingerprints(image_hash);
create index if not exists idx_image_fingerprints_perceptual on public.image_fingerprints(perceptual_hash);
create index if not exists idx_image_fingerprints_post on public.image_fingerprints(community_post_id);

-- 3. Moderation decisions audit log.
create table if not exists public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  community_post_id uuid references public.community_food_posts(id) on delete cascade,
  previous_status text,
  new_status text not null check (new_status in ('pending_review','approved','rejected','removed')),
  moderator_id uuid references auth.users(id) on delete set null,
  moderator_email text,
  decision_source text not null default 'manual' check (decision_source in ('manual','automated','system')),
  reason text,
  confidence numeric(4,3),
  service text,
  assessment jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_moderation_decisions_post on public.moderation_decisions(community_post_id, created_at desc);

-- 4. Adjust feed indexes to exclude unapproved content efficiently.
-- Drop the old feed index that mixed all statuses and create a gated one.
drop index if exists public.idx_community_posts_feed;
create index if not exists idx_community_posts_feed_approved on public.community_food_posts(status, moderation_status, created_at desc)
  where status = 'active' and moderation_status = 'approved';
