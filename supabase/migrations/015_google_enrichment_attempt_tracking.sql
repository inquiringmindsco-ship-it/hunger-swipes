-- Avoid repeatedly spending quota on recent conservative no-match results.
alter table public.places add column if not exists last_google_enrichment_at timestamptz;
create index if not exists idx_places_google_enrichment_age on public.places(last_google_enrichment_at);
