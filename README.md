# vibmehta.com

Rental application site for [vibmehta.com](https://vibmehta.com). Built for **Cloudflare Workers + static assets**, so you can import this GitHub repo directly in the Cloudflare dashboard with no build command.

Completed applications are emailed to **vibhorfall@gmail.com**.

## Load this repo in Cloudflare

1. In Cloudflare: **Workers & Pages → Create → Import a repository**.
2. Authorize GitHub if needed, then select **`vibhormehta/vibmehta.com`**.
3. Leave the build command empty. Cloudflare will read `wrangler.toml`.
4. Deploy.
5. **Settings → Domains** (or Custom domains) → add `vibmehta.com` and `www.vibmehta.com`.

The application form is the homepage. You can pre-fill a listing with:

`https://vibmehta.com/?property=123+Main+St`

## Email

The Worker tries Cloudflare Email Sending first (`applications@vibmehta.com` → `vibhorfall@gmail.com`). If that is not enabled yet, it falls back to FormSubmit.

To use native Cloudflare email:

1. Open **Email** for the `vibmehta.com` zone.
2. Enable Email Routing / Email Sending.
3. Verify `vibhorfall@gmail.com` as a destination.
4. Redeploy this Worker so the `send_email` binding is active.

Until then, the first live submission sends a one-time FormSubmit confirmation to Gmail. Click that link once; later applications arrive automatically.

## Local

```bash
npm install
npm run dev
```
