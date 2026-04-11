/* portal/db.js — universal data layer
 * Calls /.netlify/functions/db for all persistence.
 * Falls back gracefully when the function returns an error (e.g. env vars not set).
 */

const DB = {
  // ── Generic fetch helpers ──
  async get(table, id) {
    const url = id
      ? `/.netlify/functions/db?table=${table}&id=${encodeURIComponent(id)}`
      : `/.netlify/functions/db?table=${table}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`DB GET ${table} failed: ${res.status}`);
    return res.json();
  },

  async upsert(table, data) {
    const res = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'upsert', data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `DB upsert ${table} failed`);
    }
    return res.json();
  },

  async patch(table, id, data) {
    const res = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'patch', id, data }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `DB patch ${table} failed`); }
    return res.json();
  },

  async delete(table, id) {
    const res = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action: 'delete', id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `DB delete ${table} failed`);
    }
    return res.json();
  },

  // ── Articles ──
  async getArticles()          { return this.get('articles'); },
  async saveArticle(article)   { return this.upsert('articles', article); },
  async deleteArticle(id)      { return this.delete('articles', id); },

  // ── Episodes ──
  async getEpisodes()          { return this.get('episodes'); },
  async saveEpisode(episode)   { return this.upsert('episodes', episode); },
  async deleteEpisode(id)      { return this.delete('episodes', id); },

  // ── Books ──
  async getBooks()             { return this.get('books'); },
  async saveBook(book)         { return this.upsert('books', book); },
  async deleteBook(id)         { return this.delete('books', id); },

  // ── Site content (key-value) ──
  async getSiteContent() {
    const rows = await this.get('site_content');
    // Convert [{key, value}] to a flat object
    return Object.fromEntries((rows || []).map(r => [r.key, r.value]));
  },
  async setSiteContent(obj) {
    const rows = Object.entries(obj).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));
    return this.upsert('site_content', rows);
  },

  // ── Email templates ──
  async getTemplates() {
    const rows = await this.get('email_templates');
    return Object.fromEntries((rows || []).map(r => [r.type, r]));
  },
  async saveTemplate(type, tpl) {
    return this.upsert('email_templates', { type, ...tpl, updated_at: new Date().toISOString() });
  },

  // ── Submissions (inbound form submissions) ──
  async getSubmissions()           { return this.get('submissions'); },
  async patchSubmission(id, data)  { return this.patch('submissions', id, data); },

  // ── Newsletter subscribers ──
  async getNewsletterSubscribers() { return this.get('newsletter_subscribers'); },
  async unsubscribeNewsletter(id)  { return this.patch('newsletter_subscribers', id, { active: false }); },

  // ── Sent messages ──
  async getSent()              { return this.get('sent_messages'); },
  async patchSent(id, data)   { return this.patch('sent_messages', id, data); },
  async recordSent(msg)        { return this.upsert('sent_messages', { ...msg, id: msg.id || ('s-' + Date.now()), created_at: msg.sentAt || new Date().toISOString() }); },

  // ── Message threads (replies per submission) ──
  async getThread(submissionId) {
    const url = `/.netlify/functions/db?table=message_threads&filter=submission_id:eq:${encodeURIComponent(submissionId)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  },
  async saveThreadEntry(submissionId, entry) {
    return this.upsert('message_threads', {
      id: 't-' + Date.now(),
      submission_id: submissionId,
      subject: entry.subject,
      body: entry.body,
      created_at: entry.sentAt || new Date().toISOString(),
    });
  },
};

// Expose on window so portal pages can check `if (window.DB)`
window.DB = DB;
