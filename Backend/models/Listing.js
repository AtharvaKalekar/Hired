const mongoose = require('mongoose');

/**
 * Listing — single normalized job, internship, or event document.
 *
 * This collection is the sole read target for all job/internship/event API
 * endpoints. It is populated exclusively by the Python scraper engine
 * (Backend/scraper/run_search.py) — never written to from within the
 * Node.js request path.
 *
 * Mirrors schema.py in the Python scraper package.
 */
const listingSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    id:           { type: String, required: true, unique: true, index: true },
    source:       { type: String, required: true, index: true },
    category:     { type: String, enum: ['job', 'internship', 'event'], required: true, index: true },

    // ── Core fields ─────────────────────────────────────────────────────────
    title:        { type: String, required: true },
    organization: { type: String, default: '' },
    location:     { type: String, default: '' },
    is_remote:    { type: Boolean, default: false },

    // ── Rich content ────────────────────────────────────────────────────────
    description:  { type: String, default: '' },
    requirements: { type: [String], default: [] },
    skills:       { type: [String], default: [], index: true },

    // ── Compensation / type ──────────────────────────────────────────────────
    salary_or_stipend: { type: String, default: null },
    employment_type:   { type: String, default: null },

    // ── Event-only fields ────────────────────────────────────────────────────
    event_date: { type: String, default: null },
    event_type: { type: String, default: null },
    image_url:  { type: String, default: null },

    // ── Dates / lifecycle ────────────────────────────────────────────────────
    posted_date: { type: String, default: '' },
    deadline:    { type: String, default: null, index: true },
    apply_url:   { type: String, default: '' },
    is_active:   { type: Boolean, default: true, index: true },
    scraped_at:  { type: String, default: '' },
  },
  {
    // Don't use Mongoose's _id as the primary key — `id` field is the canonical key
    versionKey: false,
  }
);

// Compound index for the most common API query pattern:
//   { is_active: true, category: 'job', skills: { $in: [...] } }
listingSchema.index({ is_active: 1, category: 1 });
listingSchema.index({ is_active: 1, category: 1, skills: 1 });

module.exports = mongoose.model('Listing', listingSchema, 'listings');
