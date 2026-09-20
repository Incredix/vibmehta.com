# vibmehta.com

Theory Company rental site, hosted at [vibmehta.com](https://vibmehta.com). Brand is **Theory**; Vib Mehta is listed as the manager. Cloudflare Workers + static assets + D1.

## Endpoints

| Page | URL |
| --- | --- |
| Homepage | https://vibmehta.com/ |
| Requirements | https://vibmehta.com/requirements |
| Tour | https://vibmehta.com/tour |
| Application | https://vibmehta.com/apply |
| Fremont home | https://vibmehta.com/apply?listing=fremont |
| Private room | https://vibmehta.com/apply?listing=fremont-room (unavailable; waitlist) |
| Manager inbox | https://vibmehta.com/admin |

Tours, apply, and waitlist are driven by `src/listings.js`. Every listing gets the same feature set by default:

- `available: true` → apply + tour
- `available: false` → waitlist + tour

Override with `features: { apply, tour, waitlist }` on a listing when needed. Tour hours live in one place (`TOUR_TIMES`).

## Load this repo in Cloudflare

1. Workers & Pages → Import **`Incredix/vibmehta.com`**. Deploy command is `npx wrangler deploy`.
2. Name the project **`theory-vibmehta`**. `wrangler.toml` will attach `vibmehta.com` and `www.vibmehta.com`.
3. First deploy does **not** require D1. Homepage, apply, and email work without it.
4. For the inbox: create D1 database **`vibmehta-applications`**, paste its UUID into `wrangler.toml` (`database_id`), uncomment the `[[d1_databases]]` block, and redeploy. Then:

```bash
npx wrangler d1 migrations apply vibmehta-applications --remote
```

5. Worker secrets/vars:
   - Secret `ADMIN_PASSWORD` — sign in at `/admin`
   - Variable `LISTING_<ID>_ADDRESS` per listing (e.g. `LISTING_FREMONT_ADDRESS`)
   - Secrets `TCP_EMAIL_INGEST_URL` + `TCP_EMAIL_INGEST_SECRET` — send mail through TCP SES (no AWS keys on Cloudflare)
   - Optional live credit secrets below

Street addresses stay in env, not git. Notify-me emails the person immediately and again when that listing is marked available.

To add a listing: copy an entry in `src/listings.js`, optionally set `SITE.hero.featuredListingId`, and set `LISTING_<ID>_ADDRESS` in Cloudflare / `.dev.vars`. Use `addressFrom: "fremont"` to reuse another listing’s street address.

## Credit checks

From `/admin`, open an application and click **Run credit**.

| Setup | What happens |
| --- | --- |
| No credit keys | Labeled **demo** score so you can use the inbox immediately |
| `MICROBILT_CLIENT_ID` + `MICROBILT_CLIENT_SECRET` | Live Microbilt Experian pull |
| `CREDIT_API_URL` + `CREDIT_API_KEY` (or `CRS_API_KEY`) | Generic / CRS-style REST pull |

Live pulls need a full 9-digit SSN, DOB, and FCRA permissible purpose. Full SSN is never emailed.

## Local

```bash
cp .dev.vars.example .dev.vars
npm install
npm run preview
```
