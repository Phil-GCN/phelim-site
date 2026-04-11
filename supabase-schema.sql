-- phelim.me — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── Articles ──
create table if not exists articles (
  id          text primary key,
  title       text not null,
  excerpt     text,
  body        text,
  tag         text,
  cat         text,
  status      text default 'draft',
  readtime    text,
  meta        text,
  banner      jsonb,
  attachments jsonb default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Episodes ──
create table if not exists episodes (
  id          text primary key,
  number      text not null,
  title       text not null,
  description text,
  pillar      text,
  spotify_url text,
  youtube_url text,
  bg_color    text default '#1a3028',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Books ──
create table if not exists books (
  id               text primary key,
  title            text not null,
  subtitle         text,
  book_num         integer,
  mode             text default 'preorder',
  pub_date         text,
  price            text,
  stripe_hardcover text,
  stripe_ebook     text,
  stripe_audio     text,
  description      text,
  cover_data       text,
  cover_name       text,
  pdf_data         text,
  pdf_name         text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Site content (key-value store) ──
create table if not exists site_content (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- ── Email templates ──
create table if not exists email_templates (
  type       text primary key,
  heading    text,
  intro      text,
  body       text,
  closing    text,
  updated_at timestamptz default now()
);

-- ── Sent messages ──
create table if not exists sent_messages (
  id            text primary key,
  to_name       text,
  to_email      text,
  subject       text,
  body          text,
  type          text,
  submission_id text,
  created_at    timestamptz default now()
);

-- ── Message threads (replies per Netlify submission) ──
create table if not exists message_threads (
  id            text primary key,
  submission_id text not null,
  subject       text,
  body          text,
  created_at    timestamptz default now()
);
create index if not exists message_threads_submission_id on message_threads(submission_id);

-- ── Row Level Security ──
-- Allow all operations (portal is protected by its own password auth).
-- Lock this down when proper Supabase Auth is added.
alter table articles        enable row level security;
alter table episodes        enable row level security;
alter table books           enable row level security;
alter table site_content    enable row level security;
alter table email_templates enable row level security;
alter table sent_messages   enable row level security;
alter table message_threads enable row level security;

-- Service role bypasses RLS automatically.
-- Anon role (public site read) — only articles and episodes need public read.
create policy "public read articles"  on articles        for select using (status = 'published');
create policy "public read episodes"  on episodes        for select using (true);
create policy "public read books"     on books           for select using (true);
create policy "public read content"   on site_content    for select using (true);
-- All writes go through the service-key proxy (db.js function) — no anon write needed.

-- ══════════════════════════════════════════════════════
-- MIGRATION v2 — run these ALTER statements if you
-- already ran the schema above (no need to recreate tables)
-- ══════════════════════════════════════════════════════

-- ── Books: new fields ──
alter table books add column if not exists long_description text;
alter table books add column if not exists hook_text        text;
alter table books add column if not exists author           text default 'Phelim Ekwebe';
alter table books add column if not exists audience         text;
alter table books add column if not exists format_options   text;
alter table books add column if not exists stock_status     text default 'preorder';

-- ── Sent messages: star + read status ──
alter table sent_messages add column if not exists starred boolean default false;
alter table sent_messages add column if not exists status  text default 'read';

-- ── Book orders ──
create table if not exists book_orders (
  id             text primary key,
  book_id        text,
  book_title     text,
  format         text,
  price          text,
  first_name     text,
  last_name      text,
  email          text,
  payment_method text default 'card',
  order_type     text default 'preorder',
  status         text default 'pending',
  created_at     timestamptz default now()
);
alter table book_orders enable row level security;
-- No public read — portal only via service key

-- ── Submissions: inbound form submissions (replaces Netlify Forms) ──
create table if not exists submissions (
  id         text primary key,
  name       text,
  email      text,
  type       text,
  fields     jsonb default '{}',
  status     text default 'new',
  starred    boolean default false,
  created_at timestamptz default now()
);
alter table submissions enable row level security;
-- No public read — portal only via service key
