# Spoonfish Landing Page

## Deploy to Cloudflare Pages

### Option A: Git-based (recommended)

1. Push this folder to a GitHub/GitLab repo
2. Go to Cloudflare Dashboard → Workers & Pages → Create → Pages
3. Connect your repo
4. Build settings: leave blank (static HTML, no build step)
5. Deploy

### Option B: Direct upload

1. Go to Cloudflare Dashboard → Workers & Pages → Create → Pages
2. Choose "Upload assets"
3. Drag this entire folder
4. Deploy

## Set up the waitlist KV store

1. Install Wrangler (if not already):
   ```
   npm install -g wrangler
   ```

2. Create a KV namespace:
   ```
   wrangler kv namespace create WAITLIST
   ```
   This prints a namespace ID — copy it.

3. In the Cloudflare Dashboard:
   - Go to your Pages project → Settings → Functions → KV namespace bindings
   - Add binding: Variable name = `WAITLIST`, KV namespace = the one you just created

4. Redeploy. The `/api/waitlist` endpoint is now live.

## Connect your domain

1. In the Pages project → Custom domains → Add
2. Enter your domain (e.g., spoonfish.dev)
3. Cloudflare handles DNS and SSL automatically since the domain is already on Cloudflare

## Read waitlist emails

```bash
# List all emails
wrangler kv key list --namespace-id <your-id> --prefix "email:"

# Get a specific entry
wrangler kv get --namespace-id <your-id> "email:someone@company.com"

# Export all (pipe to jq for formatting)
wrangler kv key list --namespace-id <your-id> --prefix "email:" | jq -r '.[].name'
```

## File structure

```
index.html                    — Landing page (self-contained, no build)
functions/api/waitlist.js     — Pages Function (handles form POST → KV)
README.md                     — This file
```

## Cost

Free tier covers everything:
- Cloudflare Pages: unlimited bandwidth, unlimited requests
- Pages Functions: 100,000 requests/day free
- KV: 100,000 reads/day, 1,000 writes/day free

You won't hit these limits with a waitlist.
