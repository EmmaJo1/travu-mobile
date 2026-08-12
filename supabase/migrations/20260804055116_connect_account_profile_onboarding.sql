alter table public.users
  add column if not exists onboarding_status text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;

update public.users
set
  onboarding_status = 'completed',
  onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, created_at)
where onboarding_status is null;

alter table public.users
  alter column onboarding_status set default 'pending',
  alter column onboarding_status set not null;

alter table public.users
  drop constraint if exists users_onboarding_status_check;

alter table public.users
  add constraint users_onboarding_status_check
  check (onboarding_status in ('pending', 'completed', 'skipped'));
