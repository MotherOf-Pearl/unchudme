# Accounts — customer sign-in and profiles

How customer accounts work on the Aura Pharma site. Built 2026-10-15 on **Supabase** (hosted Postgres with built-in sign-in).

> Public repo: the Supabase **publishable** key in `js/supabase-config.js` is meant to be public; what it can do is limited by the database rules below. Never commit the **secret** / `service_role` key or the database password.

## What's live

- **Profile icon** in the header (desktop and mobile) opens `account.html`.
- **Account page** (`account.html` + `js/account.js`), styled like the affiliate portal (dark, drifting stars, one card):
  - **Sign in** (email + password, show-password eye) and **Create account** tabs. `account.html?tab=signup` opens straight on Create account.
  - **Create account** asks for full name, email, password (8+), institution or company (required), research area (optional), and a research-use confirmation (21+, qualified researcher, lab use only). The details go to the profile.
  - **Forgot your password?** emails a reset link; the link brings the customer back to the account page to choose a new password.
  - **Signed in:** name and email, two badges — **"Email verified"** (the customer confirmed their email; required to sign in) and **"Research check pending" / "Verified researcher"** (Aura Pharma's manual research-affiliation check, the `verified` column) — then editable name / institution / research area, Save, Sign out.
- **Who can sign up:** anyone (open sign-up). Every account starts **unverified**; Aura Pharma verifies research affiliation by hand before the first order. Switching to invite-only is a Supabase setting (Authentication → Sign In / Providers → turn off "Allow new users to sign up").

Not built yet: checkout tied to accounts, order history, the affiliate portal's sign-in (it will use these same accounts with `role = 'affiliate'`), an admin screen for verifying customers.

## Supabase project

| | |
|---|---|
| Project | "Aura Pharma", ref `guzqebqtxiwngutbdmkl`, organization "Aura Pharma" |
| Region | US East (Ohio) |
| URL | `https://guzqebqtxiwngutbdmkl.supabase.co` |
| Dashboard | supabase.com → Aura Pharma |
| Command-line access | `npx supabase login` in a normal PowerShell window (not inside Claude Code's `!`), then `npx supabase db query --linked --project-ref guzqebqtxiwngutbdmkl …` |

Project settings chosen at creation: Data API on; "automatically expose new tables" off; "automatic RLS" on (every new table gets row-level security). Supabase still granted full table rights to `anon` / `authenticated` by default, so the migrations revoke those and stop it for future tables: **every new table needs explicit grants.**

## Database

All schema changes are SQL files in `supabase/migrations/`, applied in name order with `npx supabase db query --linked --project-ref guzqebqtxiwngutbdmkl -f <file>`.

| file | what it does |
|---|---|
| `20261015180000_profiles.sql` | `public.profiles` table, row security policies, sign-up trigger (creates the profile from the sign-up form), email-change sync, `updated_at` |
| `20261015181000_lock_rls_auto_enable.sql` | stops the API calling Supabase's `rls_auto_enable()` helper (security advisor warning) |
| `20261015182000_tighten_profile_grants.sql` | removes Supabase's blanket table rights; grants only what the site needs; future tables get no automatic rights |

### `public.profiles`
| column | | who can change it |
|---|---|---|
| `id` | = the sign-in user's id | — |
| `email` | copied from the account, kept in step | — (follows the account email) |
| `full_name`, `institution`, `research_area` | from the sign-up form | the customer |
| `verified`, `verified_at` | research affiliation checked | **Aura Pharma only** |
| `role` | `customer` (default), `affiliate`, `admin` | **Aura Pharma only** |
| `created_at`, `updated_at` | | automatic |

**Rules (tested 2026-10-15):** a signed-in customer can read only their own profile and edit only their name, institution and research area. They cannot read or edit anyone else's, cannot set `verified` or `role`, and signed-out visitors cannot read profiles at all. Supabase's security advisor reports no warnings.

### Verifying a customer
Dashboard → Table Editor → `profiles` → set `verified` to true and `verified_at` to now. Or:
```sql
update public.profiles set verified = true, verified_at = now() where email = 'customer@example.com';
```

## Set-up still needed (Jack, in the Supabase dashboard)

1. **Website address** — Authentication → URL Configuration:
   - Site URL: `https://www.aurapharma.us`
   - Redirect URLs: `https://www.aurapharma.us/**` (accounts are tested on the live site only; sign-up from unchudme.vercel.app isn't supported)

   Without this, confirmation and password-reset emails link to the wrong place.
2. **Email sending (before real customers)** — Supabase's built-in email only delivers to members of your Supabase organization and is limited to a few per hour, so customers won't get confirmation emails until a custom sender is set: Authentication → Emails → SMTP Settings, using the info@aurapharma.us mailbox (or a sending service such as Resend or Postmark). Also edit the email templates there to say Aura Pharma.
3. **Free plan pauses** after a week without activity; upgrade (Pro) before launch.
