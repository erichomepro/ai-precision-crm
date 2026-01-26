# The Hydra Architecture

## Core Infrastructure
- **Frontend**: Next.js 15 (Firebase Hosting).
- **Backend**: Node.js/Python (Cloud Run - Scale-to-Zero).
- **Database**: Firestore (Multi-tenant data).
- **Auth**: Google Identity Platform.
- **Payments**: Stripe API.

## Multi-Tenant Logic
- **Tenant Registry**: Every user has a unique `tenant_id`.
- **Agent Isolation**: Agents (The Scout, etc.) only process data where `tenant_id == current_user`.
- **White-Labeling**: UI dynamically swaps logo/company name based on profile.

## Agent Swarm (Services)
- **StatusScout**: Maps Scraping (Puppeteer/Playwright).
- **Headhunter**: Decision Maker Retrieval (Pro).
- **Auditor**: SEO & PageSpeed Analytics (Pro).
- **Closer**: AI Proposal Generation (Pro).
- **Postman**: Gmail API & Tracking (Add-on).
