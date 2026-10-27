# Swipe Bucks activation impact

Status: **planning only — do not activate without leadership approval**.

Production currently preserves wallets, the ledger, idempotency constraints, caps, reversal support, risk flags, and administrative controls. Right swipes, saves, clicks, and first-photo rewards remain set to zero. Verified-order rewards are configured at $0.50, but no verified-order integration exists. Redemption is disabled.

## Proposed reward values

| Event | Proposed credit | Important implementation consequence |
|---|---:|---|
| Right swipe | $0.01 | Every right swipe currently also creates or refreshes a save. Paying both events would make one user action cost $0.03 unless the save reward is restricted to a separate intentional save action. |
| Save | $0.02 | Must use its own immutable source event and idempotency key. Re-saving, changing a swipe, replaying a deck, or refreshing a save must not award again. |
| Qualifying photo | $0.50 | Must award only after approval, food relevance checks, rights validation, duplicate-image checks, and moderation. Upload alone cannot qualify. |

## Direct financial exposure

At the proposed values, gross credit liability before caps is:

`$0.01 × unique qualifying right swipes + $0.02 × unique qualifying saves + $0.50 × approved qualifying photos`

Examples:

- 10,000 right swipes = $100.
- 10,000 independently qualifying saves = $200.
- 1,000 approved photos = $500.
- If a right swipe and its automatic save both earn, 10,000 right swipes cost $300 rather than $100.

The present configured caps are $50 per user per day, $500 per user per month, $10 per post, and $10,000 globally. Those limits reduce ledger growth but are not a cash budget while redemption remains disabled. Enabling redemption turns outstanding eligible credits into a financial obligation and also creates restaurant reimbursement, accounting, tax, customer-support, and fraud-loss requirements.

## Required activation controls

1. Decide whether right swipe and save are mutually exclusive reward events. Recommended: reward the explicit save once, not both the right swipe and its automatic save.
2. Define “qualifying photo” in enforceable database terms and award only after final approval.
3. Preserve current unique source-event and idempotency constraints.
4. Keep replay, swipe-direction changes, save refreshes, deletes/reuploads, duplicate images, and reciprocal engagement from re-awarding.
5. Set a launch budget below the current $10,000 global ceiling and add alerts before 50%, 75%, and 90% usage.
6. Establish expiration, reversal, dispute, tax, reimbursement, and abandoned-balance policies.
7. Run a non-redeemable pilot first, reconcile the ledger, then obtain leadership approval before enabling redemption.

No values or balances should be changed as part of the App Store release.
