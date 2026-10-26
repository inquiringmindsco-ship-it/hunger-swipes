-- Hunger Swipes — purchase-only Swipe Bucks policy.
--
-- Posting and engagement are not proof of a purchase and are easy to farm.
-- Disable those reward paths until a verified-order integration is available.
-- Existing ledger entries are preserved for audit; redemption remains disabled.

update public.swipe_bucks_config
set right_swipe_cents = 0,
    save_cents = 0,
    click_cents = 0,
    first_photo_cents = 0,
    redemption_enabled = false,
    updated_at = now()
where id = 1;

-- Remove all automatic non-purchase reward entry points.
drop trigger if exists swipe_bucks_right_swipe on public.food_swipes;
drop trigger if exists swipe_bucks_save on public.saved_food;
drop trigger if exists swipe_bucks_first_photo on public.community_food_posts;

comment on function public.process_swipe_bucks_reward(uuid, uuid, text, uuid, text, int, text, jsonb)
  is 'Internal reward processor. Production policy permits rewards only from a future verified-order integration; posting and engagement triggers are disabled.';
