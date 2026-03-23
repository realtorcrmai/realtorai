# Market Research: Add a simple status notes feature to contacts
## Date: 2026-03-21
## Query: add status notes to contacts

## Market Leaders

### Follow Up Boss
- Allows agents to add timestamped notes to any contact
- Notes are searchable and filterable
- Notes appear in the activity timeline alongside calls, emails, and SMS

### Wise Agent
- Notes field on contact card with rich text support
- Notes can be pinned or starred for importance
- Auto-generated notes from showing feedback and calls

### HubSpot CRM
- Activity notes with @mentions for team collaboration
- Notes linked to deals, contacts, and companies
- Template notes for common situations

## Common Data Model Patterns

### Notes Table
- `id` (uuid, primary key)
- `contact_id` (uuid, references contacts)
- `content` (text, the note body)
- `pinned` (boolean, default false)
- `created_by` (text, agent name/id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Relationships
- Many notes per contact (one-to-many)
- Notes displayed in reverse chronological order

## UX Patterns
- Notes section on contact detail page
- Quick-add note form (textarea + submit button)
- Pinned notes shown at top
- Timestamp and author on each note
- Edit/delete actions on own notes

## Table Stakes vs. Differentiators
- **Table stakes:** Basic note creation, timestamps, display on contact
- **Differentiator:** Note templates, AI-generated summaries, search across all notes

## Technical Considerations
- Server action for CRUD operations
- Real-time updates not needed (refetch on mutation)
- No complex validation needed (just non-empty content)
