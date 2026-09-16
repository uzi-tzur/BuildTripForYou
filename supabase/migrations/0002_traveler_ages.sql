-- Adds the "traveler ages" field from PRD Section 23 (Screen 2 — Create Trip).
alter table user_preferences add column if not exists traveler_ages text;
