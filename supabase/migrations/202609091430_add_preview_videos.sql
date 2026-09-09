-- Short preview videos for public cards/listings.
alter table if exists public.projects
    add column if not exists video_preview text;

alter table if exists public.services
    add column if not exists video_preview text;
