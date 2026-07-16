-- Client event keys let repeated guest-to-account syncs merge exactly once.
alter table quiz_attempts add column if not exists client_event_id text;
alter table study_sessions add column if not exists client_event_id text;
create unique index if not exists quiz_attempts_user_event_idx on quiz_attempts (user_id, client_event_id) where client_event_id is not null;
create unique index if not exists study_sessions_user_event_idx on study_sessions (user_id, client_event_id) where client_event_id is not null;

alter table saved_comparisons add column if not exists client_key text;
update saved_comparisons set client_key = id::text where client_key is null;
create unique index if not exists saved_comparisons_user_key_idx on saved_comparisons (user_id, client_key) where client_key is not null;
