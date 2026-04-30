-- phelim.me — Supabase schema
-- Run this in the Supabase SQL editor to create all tables from scratch.
-- Safe to re-run: all statements use CREATE TABLE IF NOT EXISTS.

-- ─────────────────────────────────────────────
-- Articles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  slug        text UNIQUE,
  body        text,
  excerpt     text,
  category    text,
  status      text NOT NULL DEFAULT 'draft',   -- 'draft' | 'published'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Episodes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS episodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,             -- short key e.g. 'btl', 'bs'
  title       text NOT NULL,
  subtitle    text,
  description text,
  cover_bg    text,
  cover_text_color text,
  label       text,                             -- e.g. 'Pre-order · Feb 2027'
  cta_text    text,                             -- button label
  status      text NOT NULL DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
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
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Submissions (contact forms)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type   text NOT NULL,                    -- 'speaking' | 'podcast' | 'writing' | 'partnership' | 'general'
  name        text,
  email       text,
  data        jsonb,                            -- all form fields
  status      text NOT NULL DEFAULT 'unread',   -- 'unread' | 'read' | 'replied'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_email_idx      ON submissions (email);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);

-- ─────────────────────────────────────────────
-- Newsletter subscribers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     text NOT NULL,
  body        text,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Book orders
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_key        text NOT NULL,
  book_title      text,
  format          text,
  price           numeric(6,2),
  payment_method  text,
  order_type      text NOT NULL DEFAULT 'preorder',
  name            text,
  email           text,
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'fulfilled'
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS book_orders_email_idx ON book_orders (email);

-- ─────────────────────────────────────────────
-- Message threads (portal inbox grouping)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     text,
  from_name   text,
  from_email  text,
  form_type   text,
  status      text NOT NULL DEFAULT 'unread',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Sent messages (portal outbox / replies)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sent_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   text,  -- matches message_threads.id type (text)
  to_email    text NOT NULL,
  to_name     text,
  subject     text NOT NULL,
  body        text,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sent_messages_thread_idx  ON sent_messages (thread_id);
CREATE INDEX IF NOT EXISTS sent_messages_created_idx ON sent_messages (created_at DESC);

-- ─────────────────────────────────────────────
-- Orders (generic — replaces book_orders for the new checkout flow)
-- Covers any sellable item: books, toolkits, courses, etc.
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
-- Enable RLS on all tables; the Netlify functions use the service role key
-- which bypasses RLS, so no policies are required for portal access.
-- Public-facing reads should go through the Netlify function proxy, not direct.
-- ─────────────────────────────────────────────
ALTER TABLE articles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends      ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_messages         ENABLE ROW LEVEL SECURITY;
