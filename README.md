# vibmehta.com

Theory Company rental site, hosted at [vibmehta.com](https://vibmehta.com). Brand is **Theory**; Vib Mehta is listed as the landlord. Cloudflare Workers + static assets + D1.

## Endpoints

| Page | URL |
| --- | --- |
| Homepage | https://vibmehta.com/ |
| Requirements | https://vibmehta.com/requirements |
| Application | https://vibmehta.com/apply |
| Fremont home | https://vibmehta.com/apply?listing=fremont |
| Private room | https://vibmehta.com/apply?listing=fremont-room (unavailable; waitlist) |
| Landlord inbox | https://vibmehta.com/admin |

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
   - Variable `LISTING_FREMONT_ADDRESS` — real street for the Fremont home
   - Optional live credit secrets below

The public site shows listing names and city, not the street address. Set `available: false` on a listing in `src/listings.js` to show it as unavailable. Notify-me signups email the person immediately and again when that listing is marked available.

To add another home, copy an entry in `src/listings.js` and set `LISTING_<ID>_ADDRESS` in Cloudflare / `.dev.vars`. The private room uses `LISTING_FREMONT_ADDRESS` unless `LISTING_FREMONT_ROOM_ADDRESS` is set.

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
