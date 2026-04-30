-- phelim.me — Supabase schema
-- Run this in the Supabase SQL editor to create all tables from scratch.
-- Safe to re-run: all statements use CREATE TABLE IF NOT EXISTS.
-- Last updated: 2026-04-30

-- ─────────────────────────────────────────────
-- Articles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id          text PRIMARY KEY DEFAULT ('art-' || substring(gen_random_uuid()::text, 1, 8)),
  title       text NOT NULL,
  slug        text UNIQUE,
  body        text,
  excerpt     text,
  tag         text,
  meta        text,
  status      text NOT NULL DEFAULT 'draft',   -- 'draft' | 'published'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Episodes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS episodes (
  id          text PRIMARY KEY DEFAULT ('ep-' || substring(gen_random_uuid()::text, 1, 8)),
  n           integer,                          -- episode number
  title       text NOT NULL,
  description text,
  bg          text,                             -- background colour hex
  youtube     text,                             -- YouTube URL
  spotify     text,                             -- Spotify URL
  status      text NOT NULL DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Books
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id                text PRIMARY KEY,           -- short key e.g. 'btl', 'bs'
  title             text NOT NULL,
  subtitle          text,
  description       text,
  cover_color       text,                       -- CSS color for book cover
  format_options    text,                       -- e.g. 'Hardcover · Paperback · eBook'
  price             text,                       -- default/display price
  price_hardcover   text,
  price_paperback   text,
  price_ebook       text,
  price_audiobook   text,
  mode              text NOT NULL DEFAULT 'preorder', -- 'preorder' | 'live'
  stock_status      text NOT NULL DEFAULT 'preorder', -- 'preorder' | 'available' | 'sold_out'
  status            text NOT NULL DEFAULT 'draft',    -- 'draft' | 'published'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Site content (key-value settings)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Email templates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          text PRIMARY KEY,
  name        text UNIQUE NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Submissions (contact forms + waitlist)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id          text PRIMARY KEY,                 -- e.g. 'sub-1234567890-ab12'
  name        text,
  email       text,
  type        text NOT NULL DEFAULT 'general',  -- 'speaking' | 'podcast' | 'writing' | 'partnership' | 'waitlist' | 'general'
  fields      jsonb,                            -- all form fields as key-value pairs
  status      text NOT NULL DEFAULT 'new',      -- 'new' | 'read' | 'replied'
  starred     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_email_idx      ON submissions (email);
CREATE INDEX IF NOT EXISTS submissions_type_idx       ON submissions (type);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);

-- ─────────────────────────────────────────────
-- Newsletter subscribers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              text PRIMARY KEY DEFAULT ('ns-' || substring(gen_random_uuid()::text, 1, 8)),
  name            text,
  email           text UNIQUE NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  subscribed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_subscribers (email);

-- ─────────────────────────────────────────────
-- Newsletter send history
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id              text PRIMARY KEY DEFAULT ('nls-' || substring(gen_random_uuid()::text, 1, 8)),
  subject         text NOT NULL,
  body            text,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Sent messages (portal outbox / replies)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sent_messages (
  id              text PRIMARY KEY,             -- e.g. 's-1234567890'
  to_name         text,
  to_email        text NOT NULL,
  subject         text NOT NULL,
  body            text,
  type            text,                         -- 'Reply' | 'Outbound'
  submission_id   text,                         -- FK to submissions.id (soft reference)
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sent_messages_submission_idx ON sent_messages (submission_id);
CREATE INDEX IF NOT EXISTS sent_messages_created_idx    ON sent_messages (created_at DESC);

-- ─────────────────────────────────────────────
-- Message threads (reply chains per submission)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id              text PRIMARY KEY,             -- e.g. 't-1234567890'
  submission_id   text NOT NULL,               -- FK to submissions.id (soft reference)
  subject         text,
  body            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_threads_submission_idx ON message_threads (submission_id);

-- ─────────────────────────────────────────────
-- Orders (checkout — books, toolkits, courses)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  text PRIMARY KEY,              -- e.g. ORD-1234567890-AB12
  item_id             text NOT NULL,                 -- catalog key, e.g. 'btl', 'bs'
  item_title          text,
  item_type           text,                          -- 'book' | 'toolkit' | 'course' | …
  variant             text,                          -- 'Hardcover' | 'PDF' | 'Standard' | …
  price               numeric(8,2),
  payment_method      text NOT NULL DEFAULT 'card',  -- 'card' | 'bank'
  payment_intent_id   text,                          -- Stripe PaymentIntent ID (card orders)
  order_type          text NOT NULL DEFAULT 'preorder', -- 'preorder' | 'purchase'
  first_name          text,
  last_name           text,
  email               text,
  status              text NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'fulfilled' | 'cancelled'
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_email_idx      ON orders (email);
CREATE INDEX IF NOT EXISTS orders_item_id_idx    ON orders (item_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

-- ─────────────────────────────────────────────
-- Row-level security (RLS)
-- Portal functions use the service role key (bypasses RLS).
-- Public reads for books/articles/episodes go through /api/db (server-side).
-- ─────────────────────────────────────────────
ALTER TABLE articles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;

-- Public SELECT policy for books (so the public site can read via /api/db)
CREATE POLICY "public read books" ON books FOR SELECT USING (true);
-- Public SELECT policy for articles and episodes (published only)
CREATE POLICY "public read articles" ON articles FOR SELECT USING (status = 'published');
CREATE POLICY "public read episodes" ON episodes FOR SELECT USING (status = 'published');
