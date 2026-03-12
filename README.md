# RealtorAI -- ListingFlow BC Real Estate Automation

A comprehensive single-page application for BC real estate agents to manage listings through all 7 MLS phases, handle contacts, schedule showings, and track calendar events -- with built-in BC regulatory form generation.

---

## Quick Start

### Option A: Double-click Launch (macOS)

1. Double-click **`ListingFlow.command`** -- it starts the Python server and opens the app in your browser automatically.

### Option B: Manual Launch

```bash
# Navigate to the project folder
cd /path/to/realtorai

# Start the server
python3 server.py

# Open in browser
open http://127.0.0.1:8767/
```

The app runs entirely in your browser with **localStorage** persistence -- no database required.

---

## Project Structure

```
realtorai/
|-- ListingFlow.html        # Main app -- all 4 sections (2684 lines, 161 KB)
|-- ListingFlow.command      # macOS double-click launcher script
|-- server.py                # Python HTTP server (port 8767) with CORS + form API
|-- forms_html.py            # 12 editable HTML form generators (BC regulatory forms)
|-- forms/                   # Pre-generated HTML forms served by the server
|   |-- _base.html           # Shared form template/base styles
|   |-- agency.html          # Agency Disclosure form
|   |-- c3.html              # Contract of Purchase & Sale (C3)
|   |-- c3conf.html          # C3 Confirmation form
|   |-- dorts.html           # Disclosure of Risks in Trading Services (BCFSA)
|   |-- drup.html            # Dual Agency / Restricted Dual Agency
|   |-- fairhsg.html         # Fair Housing Declaration
|   |-- fintrac.html         # FINTRAC Individual Identification
|   |-- mktauth.html         # Marketing Authorization
|   |-- mlc.html             # Multiple Listing Contract
|   |-- mls.html             # MLS Data Input form
|   |-- pds.html             # Property Disclosure Statement
|   |-- privacy.html         # Privacy Notice & Consent
|-- README.md                # This file
|-- public/                  # Static assets (Next.js)
|-- src/                     # Next.js source (RealtorAI web app)
|-- supabase/migrations/     # Database migration files
|-- components.json          # shadcn/ui config
|-- package.json             # Node.js dependencies
|-- netlify.toml             # Netlify deployment config
|-- next.config.ts           # Next.js configuration
```

---

## App Sections

### 1. Listings (Default View)
- **7-phase MLS pipeline**: Pre-Listing > Listing Prep > Active Listing > Showings > Offers > Conditional > Closed
- Drag-and-drop cards between phases
- Click any listing to open its detail panel with all BC regulatory forms
- Auto-generates pre-filled PDF forms (DORTS, FINTRAC, MLC, PDS, etc.)

### 2. Contacts
- Full CRUD for buyer/seller contacts
- Contact types: Buyer, Seller, Agent, Lawyer, Inspector, Mortgage Broker
- Activity timeline per contact
- Quick-add from listing context

### 3. Showings
- Request, confirm, or deny showing appointments
- Lockbox code reveal on confirmed showings
- Stats dashboard (total / confirmed / pending / denied)
- Links showings to listings and contacts

### 4. Calendar
- Monthly grid view with event indicators
- Click any day to see detailed events
- Shows confirmed showings, deadlines, and milestones
- Navigate between months

---

## Server API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Serves `ListingFlow.html` |
| `/health` | GET | Health check -- returns `{"status": "ok"}` |
| `/api/forms/<name>` | GET | Returns pre-generated HTML form |
| `/api/generate-form` | POST | Dynamically generates a form with provided data |
| `/api/push-manifest` | GET | Returns all project files as base64 JSON (for GitHub sync) |
| `/<file>` | GET | Static file serving (HTML, CSS, JS, images) |

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **Design**: Indigo-to-coral gradient theme, CSS Grid layouts, responsive
- **Storage**: Browser localStorage (no database needed for ListingFlow)
- **Server**: Python 3 `http.server` with CORS headers
- **Forms**: Server-side HTML generation via `forms_html.py`
- **Next.js App**: Separate RealtorAI web app in `src/` (Supabase backend)

---

## For Developers -- How to Sync

### Clone the repo
```bash
git clone https://github.com/realtorcrmai/realtorai.git
cd realtorai
```

### Pull latest changes
```bash
git pull origin main
```

### After making changes
```bash
git add -A
git commit -m "Brief description of what changed"
git push origin main
```

### Key files to watch
If you're working on the **ListingFlow** app specifically, these are the files that matter:

| File | What it does | Change frequency |
|---|---|---|
| `ListingFlow.html` | The entire UI + logic | **High** -- most changes happen here |
| `server.py` | HTTP server + API routes | Medium -- when adding endpoints |
| `forms_html.py` | Form generation logic | Medium -- when updating form templates |
| `forms/*.html` | Pre-built form files | Low -- regenerated from `forms_html.py` |
| `ListingFlow.command` | macOS launcher | Rare -- only if paths change |

---

## Changelog

All notable changes to this project are documented here. Developers should update this section with every push.

### [2026-03-11] -- ListingFlow Extended Release

**Added**
- **Contacts section** -- full CRUD for buyer/seller/agent contacts with activity timeline
- **Showings section** -- request, confirm, deny workflow with lockbox code reveal and stats dashboard
- **Calendar section** -- monthly grid view with event indicators and day-detail panel
- **Section navigation** -- top nav bar to switch between Listings, Contacts, Showings, Calendar
- **Section badge** -- dynamic badge showing counts for the active section
- **12 BC regulatory forms** -- server-generated HTML forms (DORTS, FINTRAC, MLC, PDS, C3, Agency, etc.)
- **Form base template** (`forms/_base.html`) -- shared styles and print-friendly layout
- **`forms_html.py`** -- Python module with 12 form generator functions
- **`/api/push-manifest`** endpoint -- serves all project files as base64 for GitHub sync
- **`ListingFlow.command`** -- macOS double-click launcher

**Fixed**
- `updateSecBadge()` -- was showing "undefined calendar" because the counts object lacked a `calendar` key; now shows confirmed showings count

**Changed**
- `ListingFlow.html` grew from ~1890 lines to 2684 lines with the new sections
- `server.py` -- added form serving endpoints and push manifest API

### [2026-03-11] -- Initial ListingFlow Upload
- Uploaded core ListingFlow files to the repository
- 7-phase MLS listing pipeline with drag-and-drop
- Indigo/coral gradient design system

### [2026-03-11] -- RealtorAI Web App (Initial)
- Next.js + Supabase CRM application
- Professional blue theme UX redesign
- Database migrations for all CRM phases

---

## Contributing

1. Always **pull before you push** (`git pull origin main`)
2. Update the **Changelog** section above with your changes
3. Use descriptive commit messages
4. Test locally by running `python3 server.py` and checking http://127.0.0.1:8767/
5. Key sections in `ListingFlow.html` are marked with comment headers:
   - `<!-- ===== SECTION: CONTACTS ===== -->`
   - `<!-- ===== SECTION: SHOWINGS ===== -->`
   - `<!-- ===== SECTION: CALENDAR ===== -->`

---

## License

Private repository -- RealtorCRM AI. All rights reserved.
