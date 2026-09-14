-- A signed-in account is counted at most once as a signup for each referral seller.
create unique index if not exists idx_referral_unique_signup_actor
  on public.seller_referrals(seller_id, (metadata->>'actor_id'))
  where event_type = 'signup' and metadata ? 'actor_id';
