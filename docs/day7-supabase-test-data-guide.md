# Day 7 Supabase Test Data Guide

## Current Auth Testing Status

Native Google and Apple login are prepared, but real iOS development build testing is paused until the Apple Developer Program setup is ready.

In Expo Go, Travu uses development-only Supabase Google OAuth after the existing terms agreement flow. This creates a real Supabase Auth session so RLS-based profile and trip data can be tested before native login is available.

Apple login is still native-only. In Expo Go, Apple does not open the native sheet; use Google for Supabase session testing.

## Expo Go OAuth and RLS

After Expo Go Google OAuth succeeds:

- `auth.users` should contain the signed-in Google user.
- `public.users` should be bootstrapped with the same `id`.
- RLS-based queries can read rows owned by that user.

If OAuth is cancelled or no session exists:

- `public.users`, `trips`, and other user-owned tables should not be queried from the client.
- RLS blocking or returning no user-owned rows without login is expected behavior.
- The app should use the existing mock/local fallback data for screen verification.

Do not add client-side service role access or RLS bypass code.

## Real Data Verification Principle

Supabase data should be verified after Expo Go Google OAuth or native login succeeds and a Supabase Auth user exists.

After login, check these in Supabase Dashboard:

1. Authentication -> Users
   - Confirm the user exists.
   - Copy the user's `id`.
2. SQL Editor or Table Editor -> `public.users`
   - Confirm a row exists with the same `id` as `auth.users.id`.
3. SQL Editor or Table Editor -> `trips`
   - Confirm test trips use the same `user_id`.

## Test Trip Insert Notes

When inserting test trips manually:

- `trips.user_id` must match an existing `auth.users.id`.
- Do not use a random UUID unless it belongs to a real auth user.
- `public.users.id` and `auth.users.id` should match.
- Soft-deleted trips with `deleted_at` set should not appear in the app.
- Client code must use the anon key only. Never use `service_role` in the app.

Example checks after real login:

```sql
select id, email, created_at
from auth.users
order by created_at desc;

select id, name, based_in, created_at
from public.users
order by created_at desc;

select id, user_id, title, destination_city, destination_country, status, deleted_at
from public.trips
order by created_at desc;
```

## Expected App Behavior During Day 7

- Expo Go Google OAuth can enter the app with a real Supabase session.
- Expo Go Apple login is skipped; use Google for data testing.
- If no real Supabase user/session exists, mypage uses local/mock profile and trip fallback data.
- If real Supabase trips exist for the logged-in user, mypage should show Supabase trips first.
- If Supabase trips are empty or unavailable, existing saved trips and mock trips remain visible.

## Day 8 Expectation

Day 8 is expected to connect the travel creation flow to `trips` and `trip_days`.

Once that flow creates rows for the authenticated user, mypage should display Supabase trips before the fallback data.

The fallback mock data stays in the project for development screen verification until enough real backend flows are connected.
