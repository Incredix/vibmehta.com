# vibmehta.com

Theory Company rental site, hosted at [vibmehta.com](https://vibmehta.com). Brand is **Theory**; Vib Mehta is listed as the landlord. Cloudflare Workers + static assets + D1.

## Endpoints

| Page | URL |
| --- | --- |
| Homepage | https://vibmehta.com/ |
| Application | https://vibmehta.com/apply |
| Fremont listing | https://vibmehta.com/apply?listing=fremont |
| Landlord inbox | https://vibmehta.com/admin |

## Load this repo in Cloudflare

1. Workers & Pages → Create → **Import a repository** → `vibhormehta/vibmehta.com`
2. Leave the build command empty.
3. Create a **D1** database named `vibmehta-applications`, bind it to the Worker as `DB`, and replace `database_id` in `wrangler.toml`.
4. In the Worker: **Settings → Variables and Secrets**
   - Secret `ADMIN_PASSWORD` — sign in at `/admin`
   - Variable `LISTING_FREMONT_ADDRESS` — real street for the Fremont home
   - Optional live credit secrets below
5. Custom domains `vibmehta.com` and `www.vibmehta.com` are declared in `wrangler.toml`.
6. Run D1 migrations:

```bash
npx wrangler d1 migrations apply vibmehta-applications --remote
```

The public site shows **Fremont home · Fremont, CA**, not the street address.

To add another home, copy an entry in `src/listings.js` and set `LISTING_<ID>_ADDRESS` in Cloudflare / `.dev.vars`.

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
