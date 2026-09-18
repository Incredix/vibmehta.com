# vibmehta.com

Rental application site for [vibmehta.com](https://vibmehta.com). Built for **Cloudflare Workers + static assets + D1**, so you can import this GitHub repo directly in the Cloudflare dashboard.

- Public form: `/`
- Landlord inbox: [`/admin`](https://vibmehta.com/admin)
- Applications are emailed to **vibhorfall@gmail.com** and stored in D1

## Load this repo in Cloudflare

1. Workers & Pages → Create → **Import a repository** → `vibhormehta/vibmehta.com`
2. Leave the build command empty.
3. Create a **D1** database named `vibmehta-applications`, bind it to the Worker as `DB`, and replace `database_id` in `wrangler.toml`.
4. In the Worker: **Settings → Variables and Secrets**
   - Secret `ADMIN_PASSWORD` — this is how you sign in at `/admin`
   - Variable `LISTING_FREMONT_ADDRESS` — real street for the Fremont home (not shown on the public form)
   - Optional live credit secrets below
5. Deploy, then add custom domains `vibmehta.com` and `www.vibmehta.com`.
6. Run D1 migrations from the dashboard or:

```bash
npx wrangler d1 migrations apply vibmehta-applications --remote
```

The public form shows **Fremont home · Fremont, CA**. Share `https://vibmehta.com/?listing=fremont`.

To add another home, copy an entry in `src/listings.js` and set `LISTING_<ID>_ADDRESS` in Cloudflare / `.dev.vars`.

## Credit checks

From `/admin`, open an application and click **Run credit**.

| Setup | What happens |
| --- | --- |
| No credit keys | Labeled **demo** score so you can use the inbox immediately |
| `MICROBILT_CLIENT_ID` + `MICROBILT_CLIENT_SECRET` | Live Microbilt Experian pull |
| `CREDIT_API_URL` + `CREDIT_API_KEY` (or `CRS_API_KEY`) | Generic / CRS-style REST pull |

Live pulls need a full 9-digit SSN, DOB, and FCRA permissible purpose. The applicant already consents on the form. Full SSN is stored for the pull only and is **never emailed**.

Optional: `MICROBILT_SANDBOX=true`, `MICROBILT_PRODUCT_PATH`, `CRS_CONFIG`.

## Local

```bash
cp .dev.vars.example .dev.vars
npm install
npm run db:local
npm run dev
```

Sign in at `/admin` with the password in `.dev.vars` (`local-admin` in the example).
