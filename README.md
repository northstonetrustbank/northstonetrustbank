# Northstone Trust Bank

The Northstone Trust Bank web app: a public marketing site, a client banking
portal, and an admin portal for the staff who run the bank.

Built on Next.js 16 (App Router) + TypeScript + Tailwind v4, Prisma 6 against
Supabase Postgres, custom JWT-cookie auth, and company SMTP through Spacemail.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The app needs a database before most pages work. Fill in `.env` (see the
comments in that file), then:

```bash
npx prisma db push
npm run seed
```

`npm run seed` creates the first admin: **info@northstonetrustbank.com** with the
password `ChangeMe-Northstone1`. **Change it at `/account` immediately after the
first sign-in.**

## How the money side works

Two rules hold the whole thing together:

- **Balances are never edited directly.** A balance is always the sum of POSTED
  rows in an append-only transaction ledger. To move money you add a row.
- **A person approves everything.** Sign-ups, deposits, withdrawals, loans and
  credit lines all sit in a queue until an admin decides. The audit log records
  every decision and cannot be edited.

## The three surfaces

| Surface | Where | Who |
| --- | --- | --- |
| Marketing site | `/`, `/about`, `/faq`, `/contact`, `/security`, `/products/*`, `/legal/*` | Anyone |
| Client portal | `/dashboard`, `/deposit`, `/withdraw`, `/send`, `/transfer`, `/goals`, `/statements`, `/activity`, `/account` | Signed-in clients |
| Admin portal | `/admin/*` | Staff |

The admin portal opens on a "what needs you today" home screen, and every page
carries plain-English instructions — it is built for staff who do not think of
themselves as computer people.

## Email

All automated mail sends from **noreply@northstonetrustbank.com**, with reply-to
set to support@ so clients reach a real person. Admins can also send broadcasts
as info@, support@ or accountmanager@ from `/admin/messages`; the app
authenticates to SMTP as whichever mailbox is sending, because Spacemail rejects
sending "as" an address you are not signed in as.

New live-chat threads are announced to **info@northstonetrustbank.com**, which
`CHAT_NOTIFY_EMAIL` overrides. The contact form is separate: it routes by topic in
`src/lib/actions/contact-actions.ts` — general enquiries to info@, account, deposit
and complaint enquiries to support@, and applications to accountmanager@ — with the
sender set as reply-to so replying from the admin inbox reaches them.

`/admin/inbox` reads those mailboxes over IMAP so staff can read and reply
without leaving the portal.

## Languages

The whole client-facing site runs in English, French, German and Spanish, driven
by dictionaries in `src/i18n/` and an `ns_locale` cookie. The admin portal is
English only.

## Things worth knowing before you edit

- **Do not edit files with PowerShell `Get-Content | Set-Content`.** PowerShell
  5.1 reads UTF-8 as ANSI and mangles em-dashes. Use an editor that writes UTF-8,
  or Node.
- After changing `prisma/schema.prisma`, stop the dev server before running
  `prisma generate` — Windows holds a lock on the query engine DLL.
- If routes start 404ing after a rename, delete `.next` and restart. The
  Turbopack dev cache goes stale.
- Server Actions cap request bodies at 1 MB by default. `next.config.ts` raises
  it to 4 MB, and `FileField` downscales photos in the browser before upload —
  without both, phone photos of ID documents fail silently.

## Secrets

`.env`, `/img`, `/instructions.txt`, `/project-notes` and `/reviews and forensic`
are all gitignored. Keep credentials in `.env` only, and set the same values as
environment variables in Vercel.
