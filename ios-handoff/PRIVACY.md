# Hunger Swipes iOS — Privacy & Data Inventory

This document supports App Store privacy label disclosures. It reflects actual data practices in the iOS app.

## Data collected or linked to user identity

| Data type | Why | Required? | User control |
|-----------|-----|-----------|--------------|
| Email | Authentication (Supabase Auth) | Required for account | Collected at sign-up |
| Phone number | Optional recovery/verification | Optional | User-provided |
| Name / username | Profile display | Optional | User-provided |
| Photos | Food photo uploads | Optional for posting | Camera / photo library permission |
| Location | Nearby food discovery | Optional | Location permission |
| Device ID | Push notification token (APNS) | Optional | Push notification permission |
| User content | Community food posts, saves, swipes | Core feature | Created by user |
| Crash data | App stability (not implemented) | Future | N/A |

## Data NOT collected

- Contacts
- Browsing history
- Search history
- Purchases (Stripe handles payments; app does not store card data)
- Health / fitness data
- Sensitive personal information beyond email/optional phone

## Data retention

- Auth account: retained until user deletes account
- Community posts: retained until user deletes post or account
- Swipe/save history: retained for platform features and reward attribution
- Anonymized/deleted account data is removed or masked per the account deletion flow

## Account deletion

The app provides an in-app account deletion option at **Account → Delete Account**. It:
1. Calls `DELETE /api/account/delete`
2. Deletes the Supabase auth user
3. Anonymizes the user profile and marks community posts as removed

This satisfies Apple’s account-deletion requirement.

## Third-party services

| Service | Purpose | Data shared |
|---------|---------|-------------|
| Supabase | Auth, database, storage | Email, user content, optional phone |
| Stripe | Payments (web fallback) | No app-side card data |
| Vercel | Web/API hosting | Anonymous request logs |

## Kids

Hunger Swipes is not targeted at children under 13.
